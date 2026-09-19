#!/usr/bin/env bash
# SSH wrapper for plistCSV postgres backup rsync/ssh (same pattern as fraBering rot-backup).

ENV_FILE="${POSTGRES_BACKUP_ENV:-/etc/bering/postgres-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

export HOME="${BACKUP_HOME:-${HOME:-/home/andy}}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"

if [[ ! -f "$SSH_CONFIG" ]]; then
  echo "postgres-backup-ssh: missing SSH_CONFIG $SSH_CONFIG" >&2
  exit 1
fi

SSH_ARGS=(-F "$SSH_CONFIG" -o BatchMode=yes -o PreferredAuthentications=publickey)
if [[ -n "${SSH_IDENTITY_FILE:-}" && -f "$SSH_IDENTITY_FILE" ]]; then
  SSH_ARGS+=(-i "$SSH_IDENTITY_FILE" -o IdentitiesOnly=yes)
fi

exec ssh "${SSH_ARGS[@]}" "$@"
