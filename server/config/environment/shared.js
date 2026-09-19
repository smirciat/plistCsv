'use strict';

var path = require('path');

exports = module.exports = {
  // List of user roles
  userRoles: ['guest', 'user', 'admin'],
  geoToken: process.env.GEO_TOKEN,

  // mccPilotLog SQLite (read-only logbook); see docs/logbook-database-plan.md
  logbook: {
    sqlitePath: process.env.LOGBOOK_SQLITE_PATH || 'uploads/database.db',
    databaseUrl: process.env.LOGBOOK_DATABASE_URL || '',
    firebaseEmployeeId: process.env.LOGBOOK_FIREBASE_EMPLOYEE_ID || '933',
    firebaseSyncStatePath: process.env.LOGBOOK_FIREBASE_SYNC_STATE || 'uploads/logbook-firebase-sync.json'
  }
};
