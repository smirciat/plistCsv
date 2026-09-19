'use strict';

const fs = require('fs');
const path = require('path');
const logbook = require('./index');
const { fetchFlightIndexPlistRows } = require('../firebase');
const {
  buildLogbookRecordFromPlistRow,
  loadAirportsForLogbook
} = require('./flightIndexToLogbook');

const PROJECT_ROOT = path.join(__dirname, '../../..');

function defaultEmployeeId() {
  return process.env.LOGBOOK_FIREBASE_EMPLOYEE_ID || '933';
}

function resolveSyncStatePath() {
  const rel = process.env.LOGBOOK_FIREBASE_SYNC_STATE || 'uploads/logbook-firebase-sync.json';
  return path.isAbsolute(rel) ? rel : path.join(PROJECT_ROOT, rel);
}

function readSyncState() {
  const filePath = resolveSyncStatePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeSyncState(state) {
  const filePath = resolveSyncStatePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function ymdFromIso(iso) {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return null;
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

async function resolveImportStartYmd() {
  const state = readSyncState();
  if (state && state.importedThroughDate) {
    return logbook.addDaysYmd(state.importedThroughDate, 1);
  }
  const latest = await logbook.getLatestFlightDateYmd();
  if (latest) {
    return logbook.addDaysYmd(latest, 1);
  }
  return null;
}

/**
 * Manual forward sync: Firebase flightIndex → mccPilotLog SQLite from day after last import through today.
 */
async function syncFromFirebase(options) {
  const employeeId = (options && options.employeeId) || defaultEmployeeId();
  const endYmd = logbook.todayYmd();
  const startYmd = await resolveImportStartYmd();

  if (!startYmd) {
    return {
      ok: true,
      employeeId,
      imported: 0,
      skipped: 0,
      message: 'No baseline flight date in logbook; set importedThroughDate in sync state or add flights first.',
      startYmd: null,
      endYmd,
      lastSyncAt: (readSyncState() || {}).lastSyncAt || null
    };
  }

  if (startYmd > endYmd) {
    const state = readSyncState() || {};
    return {
      ok: true,
      employeeId,
      imported: 0,
      skipped: 0,
      message: 'Logbook is already through ' + (state.importedThroughDate || endYmd) + '.',
      startYmd,
      endYmd,
      lastSyncAt: state.lastSyncAt || null,
      importedThroughDate: state.importedThroughDate || null
    };
  }

  const rows = await fetchFlightIndexPlistRows(employeeId, startYmd, endYmd);
  const airports = await loadAirportsForLogbook();
  let imported = 0;
  let skipped = 0;
  let maxImportedDate = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const flightYmd = ymdFromIso(row.date);
    if (!flightYmd || flightYmd < startYmd || flightYmd > endYmd) {
      skipped++;
      continue;
    }
    const pairing = row.pfrNumber ? String(row.pfrNumber) : '';
    if (pairing && await logbook.flightExistsByPairing(pairing)) {
      skipped++;
      if (!maxImportedDate || flightYmd > maxImportedDate) {
        maxImportedDate = flightYmd;
      }
      continue;
    }

    const logbookAircraftCode = await logbook.lookupAircraftCodeByTail(row.acftNumber);
    const record = buildLogbookRecordFromPlistRow(row, {
      airports,
      empNum: employeeId,
      logbookAircraftCode
    });
    if (!record) {
      skipped++;
      continue;
    }

    await logbook.insertFlightRecord(record);
    imported++;
    if (!maxImportedDate || flightYmd > maxImportedDate) {
      maxImportedDate = flightYmd;
    }
  }

  const now = new Date().toISOString();
  const prev = readSyncState() || {};
  const importedThroughDate = maxImportedDate || endYmd;
  const nextState = {
    employeeId,
    lastSyncAt: now,
    importedThroughDate,
    lastRun: {
      at: now,
      startYmd,
      endYmd,
      imported,
      skipped,
      firebaseRows: rows.length
    }
  };
  writeSyncState(nextState);

  return {
    ok: true,
    employeeId,
    imported,
    skipped,
    startYmd,
    endYmd,
    lastSyncAt: now,
    importedThroughDate,
    firebaseRows: rows.length
  };
}

function getSyncInfo() {
  const state = readSyncState();
  return {
    employeeId: defaultEmployeeId(),
    lastSyncAt: state && state.lastSyncAt ? state.lastSyncAt : null,
    importedThroughDate: state && state.importedThroughDate ? state.importedThroughDate : null,
    lastRun: state && state.lastRun ? state.lastRun : null
  };
}

module.exports = {
  syncFromFirebase,
  getSyncInfo,
  readSyncState,
  resolveSyncStatePath
};
