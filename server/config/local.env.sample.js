'use strict';

// Use local.env.js for environment variables that grunt will set when the server starts locally.
// Use for your api keys, secrets, etc. This file should not be tracked by git.
//
// You will need to set these on the server you deploy to.

module.exports = {
  DOMAIN:           'http://localhost:9000',
  SESSION_SECRET:   'plistcsv-secret',

  // Primary Sequelize DB (generator models) — e.g. postgres://user:pass@localhost:5432/rotdb
  SEQUELIZE_URI:    '',

  // mccPilotLog SQLite file (ETL source); default uploads/database.db
  LOGBOOK_SQLITE_PATH: 'uploads/database.db',

  // Logbook API backend: set to Postgres URI (e.g. same as SEQUELIZE_URI → rotdb) after ETL
  // LOGBOOK_DATABASE_URL: 'postgres://user:pass@localhost:5432/rotdb',

  // Logbook reads SQLite via system sqlite3 binary (no node-sqlite3 native build required)
  // SQLITE3_CLI: '/usr/bin/sqlite3',

  // Path to backup env (used by POST /api/logbook/backup-postgres)
  // POSTGRES_BACKUP_ENV: '/etc/bering/postgres-backup.env',

  // Firebase flightIndex → logbook SQLite (manual sync on /logbook)
  // LOGBOOK_FIREBASE_EMPLOYEE_ID: '933',
  // LOGBOOK_FIREBASE_SYNC_STATE: 'uploads/logbook-firebase-sync.json',

  // Control debug level for modules using visionmedia/debug
  DEBUG: ''
};
