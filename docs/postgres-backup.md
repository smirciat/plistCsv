# Postgres backup (rotdb → bering-vultr)

Daily-style dump of the plistCSV Postgres database (`rotdb`: generator tables + `logbook` schema) to **bering-vultr** at **`/root/backup/`**.

## Setup

1. Copy the env template (outside git):

   ```bash
   sudo mkdir -p /etc/bering
   sudo cp scripts/postgres-backup/postgres-backup.env.sample /etc/bering/postgres-backup.env
   sudo chown "$USER:$USER" /etc/bering/postgres-backup.env
   chmod 600 /etc/bering/postgres-backup.env
   ```

   (`sudo cp` leaves the file owned by root; **`chown` before `chmod`** or use `sudo chmod 600`.)

2. Edit `/etc/bering/postgres-backup.env`:
   - `PGHOST`, `PGUSER`, `PGDATABASE=rotdb`, and password via **`PGPASSWORD`** in that file or **`~/.pgpass`**
   - Or set **`DATABASE_URL`** (same as `SEQUELIZE_URI` / `LOGBOOK_DATABASE_URL` in `local.env.js` — do not commit)
   - SSH: `SSH_CONFIG`, `SSH_IDENTITY_FILE` (same **`bering_backup`** key as fraBering ROT backups)
   - `REMOTE_HOST=bering-vultr`, `REMOTE_DIR=/root/backup`

3. Ensure `Host bering-vultr` exists in `~/.ssh/config` and the backup key can write to `/root/backup/` on Vultr.

4. Make scripts executable:

   ```bash
   chmod +x scripts/postgres-backup/backup-postgres.sh scripts/postgres-backup/postgres-backup-ssh.sh
   ```

## Run manually

```bash
POSTGRES_BACKUP_ENV=/etc/bering/postgres-backup.env \
  ./scripts/postgres-backup/backup-postgres.sh
```

Dry run:

```bash
POSTGRES_BACKUP_ENV=/etc/bering/postgres-backup.env \
  ./scripts/postgres-backup/backup-postgres.sh --dry-run
```

Artifacts:

- Local: `BACKUP_DIR/rotdb-YYYY-MM-DD.sql.gz` (default `/home/andy/backups`)
- Remote: `/root/backup/rotdb-YYYY-MM-DD.sql.gz`

Retention: `LOCAL_KEEP_COUNT` (default 3), `REMOTE_KEEP_COUNT` (default 7).

## When to run (no cron required)

**Suggested:** on **Logbook**, after **Import from Firebase** succeeds, use **Backup Postgres to Vultr** (or leave **Backup after successful import** checked — default on).

Same from the shell:

```bash
POSTGRES_BACKUP_ENV=/etc/bering/postgres-backup.env ./scripts/postgres-backup/backup-postgres.sh
```

API: `POST /api/logbook/backup-postgres` (runs that script on the server).

Optional cron is still fine for unattended daily dumps; see `postgres-backup.env.sample`.

## Restore (short)

On a host with `psql` and an empty `rotdb`:

```bash
gunzip -c rotdb-2026-09-19.sql.gz | psql -h localhost -U postgres -d rotdb
```

Use `--single-transaction` or restore to a new database first if you need a dry run.

## fraBering

You can point **`SSH_WRAPPER`** at `~/fraBering/scripts/rot-backup/rot-backup-ssh.sh` and share **`ROT_BACKUP_ENV`** SSH settings if both use the same key and `~/.ssh/config`.
