'use strict';

const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const PROJECT_ROOT = path.join(__dirname, '../../..');

function backupEnvPath() {
  return process.env.POSTGRES_BACKUP_ENV || '/etc/bering/postgres-backup.env';
}

function backupScriptPath() {
  return path.join(PROJECT_ROOT, 'scripts/postgres-backup/backup-postgres.sh');
}

/**
 * Run backup-postgres.sh (pg_dump + rsync to bering-vultr). Intended after logbook Firebase import.
 */
async function runPostgresBackup() {
  const script = backupScriptPath();
  const envFile = backupEnvPath();
  const home = process.env.BACKUP_HOME || process.env.HOME || '/home/andy';
  const env = Object.assign({}, process.env, {
    POSTGRES_BACKUP_ENV: envFile,
    HOME: home,
    BACKUP_HOME: home
  });

  const { stdout, stderr } = await execFileAsync(script, [], {
    env,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 15 * 60 * 1000
  });

  const lines = String(stdout || '').trim().split('\n').filter(Boolean);
  const lastLine = lines.length ? lines[lines.length - 1] : '';
  return {
    ok: true,
    envFile,
    script,
    summary: lastLine,
    logTail: lines.slice(-8)
  };
}

module.exports = {
  runPostgresBackup,
  backupEnvPath,
  backupScriptPath
};
