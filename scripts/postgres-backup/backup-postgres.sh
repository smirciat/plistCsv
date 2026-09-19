#!/usr/bin/env bash
#
# Dump plistCSV Postgres (rotdb) and copy to bering-vultr:/root/backup/
#
#   POSTGRES_BACKUP_ENV=/path/to/postgres-backup.env ./scripts/postgres-backup/backup-postgres.sh
#   ./scripts/postgres-backup/backup-postgres.sh --dry-run
#
# See docs/postgres-backup.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${POSTGRES_BACKUP_ENV:-/etc/bering/postgres-backup.env}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

export HOME="${BACKUP_HOME:-${HOME:-}}"
if [[ -z "$HOME" || "$HOME" == "/" ]]; then
  echo "ERROR: set BACKUP_HOME in $ENV_FILE" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
LOCAL_KEEP_COUNT="${LOCAL_KEEP_COUNT:-3}"
REMOTE_HOST="${REMOTE_HOST:-bering-vultr}"
REMOTE_DIR="${REMOTE_DIR:-/root/backup}"
REMOTE_KEEP_COUNT="${REMOTE_KEEP_COUNT:-7}"
BACKUP_NAME_PREFIX="${BACKUP_NAME_PREFIX:-rotdb}"
MIN_FREE_GB="${MIN_FREE_GB:-2}"

SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE:-}"
SSH_WRAPPER="${SSH_WRAPPER:-$SCRIPT_DIR/postgres-backup-ssh.sh}"

DATE_TAG="$(date +%Y-%m-%d)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="${BACKUP_NAME_PREFIX}-${DATE_TAG}.sql.gz"

if ! mkdir -p "$BACKUP_DIR" 2>/dev/null; then
  if [[ "$BACKUP_DIR" == /var/* ]]; then
    BACKUP_DIR="$HOME/backups"
    mkdir -p "$BACKUP_DIR"
    echo "WARN: cannot write to configured BACKUP_DIR; using $BACKUP_DIR" >&2
  else
    echo "ERROR: cannot create BACKUP_DIR: $BACKUP_DIR" >&2
    exit 1
  fi
fi
chmod 700 "$BACKUP_DIR" 2>/dev/null || true
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"

resolve_ssh_identity() {
  if [[ -n "$SSH_IDENTITY_FILE" && -f "$SSH_IDENTITY_FILE" ]]; then
    return 0
  fi
  if [[ -f "$SSH_CONFIG" ]]; then
    local id
    id="$(ssh -F "$SSH_CONFIG" -G "$REMOTE_HOST" 2>/dev/null | awk '/^identityfile / {print $2; exit}')"
    if [[ -n "$id" && -f "$id" ]]; then
      SSH_IDENTITY_FILE="$id"
      return 0
    fi
  fi
  if [[ -f "$HOME/.ssh/id_ed25519_bering_vultr" ]]; then
    SSH_IDENTITY_FILE="$HOME/.ssh/id_ed25519_bering_vultr"
    return 0
  fi
  if [[ -f "$HOME/.ssh/bering_backup" ]]; then
    SSH_IDENTITY_FILE="$HOME/.ssh/bering_backup"
    return 0
  fi
  return 1
}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  if [[ -n "${ALERT_EMAIL:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo "$*" | mail -s "Postgres backup failed on $(hostname)" "$ALERT_EMAIL" || true
  fi
  exit 1
}

free_gb() {
  df -BG "$BACKUP_DIR" 2>/dev/null | awk 'NR==2 {gsub(/G/,"",$4); print $4}'
}

prune_local() {
  local keep="$1"
  local to_delete
  to_delete="$(ls -1t "$BACKUP_DIR"/${BACKUP_NAME_PREFIX}-*.sql.gz 2>/dev/null | tail -n +$((keep + 1)) || true)"
  if [[ -z "$to_delete" ]]; then
    return
  fi
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    log "Local prune: $f"
    rm -f "$f"
  done <<< "$to_delete"
}

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump not found (install postgresql-client)"

[[ -x "$SSH_WRAPPER" ]] || chmod +x "$SSH_WRAPPER"
[[ -f "$SSH_CONFIG" ]] || fail "SSH_CONFIG not found: $SSH_CONFIG"
resolve_ssh_identity || fail "No SSH key found; set SSH_IDENTITY_FILE in $ENV_FILE or add IdentityFile for Host $REMOTE_HOST in $SSH_CONFIG"
export SSH_IDENTITY_FILE
export SSH_CONFIG
export POSTGRES_BACKUP_ENV="$ENV_FILE"

ssh_remote() {
  "$SSH_WRAPPER" "$REMOTE_HOST" "$@"
}

rsync_remote() {
  rsync -av --partial -e "$SSH_WRAPPER" "${ARCHIVE_PATH}" "${REMOTE_HOST}:${REMOTE_DIR}/"
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  PG_CONN=(--dbname="$DATABASE_URL")
else
  : "${PGHOST:?Set PGHOST or DATABASE_URL in $ENV_FILE}"
  : "${PGDATABASE:?Set PGDATABASE or DATABASE_URL}"
  PG_CONN=(--host="${PGHOST}" --port="${PGPORT:-5432}" --username="${PGUSER:-postgres}" --dbname="${PGDATABASE}")
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "ENV_FILE=$ENV_FILE"
  echo "Would dump to: $ARCHIVE_PATH"
  echo "Would rsync to: ${REMOTE_HOST}:${REMOTE_DIR}/"
  echo "pg_dump ${PG_CONN[*]} (password via PGPASSWORD or .pgpass)"
  exit 0
fi

FREE_GB="$(free_gb || echo 0)"
if [[ "$FREE_GB" -lt "$MIN_FREE_GB" ]]; then
  fail "Less than ${MIN_FREE_GB}GB free on ${BACKUP_DIR} (have ${FREE_GB}GB)"
fi

if [[ -f "$ARCHIVE_PATH" ]]; then
  log "Today's archive already exists: $ARCHIVE_PATH (skipping dump, will still push/prune)"
else
  log "Dumping ${BACKUP_NAME_PREFIX} → ${ARCHIVE_PATH}"
  TMP="${BACKUP_DIR}/.${BACKUP_NAME_PREFIX}-${STAMP}.sql.gz"
  if ! pg_dump "${PG_CONN[@]}" --no-owner --no-acl | gzip -9 > "$TMP"; then
    rm -f "$TMP"
    fail "pg_dump failed"
  fi
  mv "$TMP" "$ARCHIVE_PATH"
  SIZE_MB="$(du -m "$ARCHIVE_PATH" | awk '{print $1}')"
  log "Created ${ARCHIVE_PATH} (${SIZE_MB} MB)"
fi

log "Pushing to ${REMOTE_HOST}:${REMOTE_DIR}/"
ssh_remote "mkdir -p '${REMOTE_DIR}'"
rsync_remote || fail "rsync to ${REMOTE_HOST} failed"

log "Pruning remote (keep ${REMOTE_KEEP_COUNT})"
ssh_remote \
  "ls -1t '${REMOTE_DIR}'/${BACKUP_NAME_PREFIX}-*.sql.gz 2>/dev/null | tail -n +$((REMOTE_KEEP_COUNT + 1)) | xargs -r rm -f" \
  || log "WARN: remote prune failed"

prune_local "$LOCAL_KEEP_COUNT"
log "Backup finished OK"
