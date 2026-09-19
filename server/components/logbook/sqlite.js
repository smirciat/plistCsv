'use strict';

/**
 * Read mccPilotLog SQLite via the system `sqlite3` CLI (-json).
 * Avoids node-sqlite3 native bindings (fragile on legacy Node/npm installs).
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const { assertYmd, addDaysYmd, todayYmd } = require('./dates');
const { emptySummaryRow, mapSummaryToAnnualResume } = require('./summaryHelpers');

const SQLITE_BIN = process.env.SQLITE3_CLI || 'sqlite3';
const PROJECT_ROOT = path.join(__dirname, '../../..');

function resolveDbPath() {
  const rel = process.env.LOGBOOK_SQLITE_PATH || 'uploads/database.db';
  return path.isAbsolute(rel) ? rel : path.join(PROJECT_ROOT, rel);
}

function sqlQuote(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function assertFlightCode(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Invalid flight code');
  }
  return n;
}

async function runJsonQuery(sql) {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error('Logbook database not found at ' + dbPath);
  }
  const { stdout } = await execFileAsync(SQLITE_BIN, ['-json', dbPath, sql], {
    maxBuffer: 64 * 1024 * 1024
  });
  if (!stdout || !String(stdout).trim()) {
    return [];
  }
  return JSON.parse(stdout);
}

async function runOne(sql) {
  const rows = await runJsonQuery(sql);
  return rows[0] || null;
}

async function runExec(sql) {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error('Logbook database not found at ' + dbPath);
  }
  await execFileAsync(SQLITE_BIN, [dbPath, sql], {
    maxBuffer: 64 * 1024 * 1024
  });
}

const FLIGHT_SELECT = `
  SELECT
    f.FlightCode AS flightCode,
    f.FlightDate AS flightDate,
    f.FlightNumber AS flightNumber,
    f.minTotal AS minTotal,
    f.minPIC AS minPIC,
    f.minNight AS minNight,
    f.minIFR AS minIFR,
    f.minXC AS minXC,
    f.TODay AS toDay,
    f.TONight AS toNight,
    f.LdgDay AS ldgDay,
    f.LdgNight AS ldgNight,
    f.DepTime AS depTime,
    f.ArrTime AS arrTime,
    f.Remarks AS remarks,
    f.DepCode AS depCode,
    f.ArrCode AS arrCode,
    f.Pairing AS pairing,
    f.UserN2 AS userN2,
    f.PF AS pf,
    COALESCE(NULLIF(a.Fin, ''), a.Reference) AS aircraft,
    a.Make AS aircraftMake,
    a.Model AS aircraftModel
  FROM Flight f
  LEFT JOIN Aircraft a ON f.AircraftCode = a.AircraftCode
`;

function buildWhereParts(options) {
  const where = [];

  if (options.from) {
    assertYmd(options.from, 'from');
    where.push('date(f.FlightDate) >= date(' + sqlQuote(options.from) + ')');
  }
  if (options.to) {
    assertYmd(options.to, 'to');
    where.push('date(f.FlightDate) <= date(' + sqlQuote(options.to) + ')');
  }
  if (options.q) {
    const like = sqlQuote('%' + String(options.q).replace(/'/g, '') + '%');
    where.push(
      '(f.FlightNumber LIKE ' + like + ' OR f.Remarks LIKE ' + like +
      ' OR a.Fin LIKE ' + like + ' OR a.Reference LIKE ' + like + ')'
    );
  }
  if (options.flightTimeOnly === true || options.flightTimeOnly === 'true' || options.flightTimeOnly === '1') {
    where.push('f.minTotal > 0');
  }

  return where;
}

function buildWhereSql(options) {
  const where = buildWhereParts(options);
  return where.length ? 'WHERE ' + where.join(' AND ') : '';
}

const SUMMARY_SELECT = `
  SELECT
    COUNT(*) AS flights,
    COALESCE(SUM(f.minTotal), 0) AS minTotal,
    COALESCE(SUM(f.minPIC), 0) AS minPIC,
    COALESCE(SUM(f.minCoP), 0) AS minCoP,
    COALESCE(SUM(f.minDual), 0) AS minDual,
    COALESCE(SUM(f.minNight), 0) AS minNight,
    COALESCE(SUM(f.minXC), 0) AS minXC,
    COALESCE(SUM(CASE WHEN f.minXC > 0 THEN f.minNight ELSE 0 END), 0) AS minNightXC,
    COALESCE(SUM(f.minIFR), 0) AS minIFR,
    COALESCE(SUM(f.TODay + f.TONight), 0) AS takeoffs,
    COALESCE(SUM(f.LdgDay + f.LdgNight), 0) AS landings,
    COALESCE(SUM(CASE WHEN a.Power IN (2, 4, 5, 6) THEN f.minTotal ELSE 0 END), 0) AS turbineMinutes,
    COALESCE(SUM(CASE WHEN COALESCE(a.Kg5700, 0) = 1 OR a.Model LIKE '%1900%' THEN f.minTotal ELSE 0 END), 0) AS melMinutes,
    COALESCE(SUM(CASE WHEN a.Category = 1 AND a.Power = 2 AND COALESCE(a.Kg5700, 0) = 0 THEN f.minTotal ELSE 0 END), 0) AS selMinutes,
    COALESCE(SUM(CASE WHEN COALESCE(a.FNPT, 0) > 0 OR a.Make = 'ATC' THEN f.minTotal ELSE 0 END), 0) AS simulatorMinutes,
    COALESCE(SUM(CASE
      WHEN a.Make LIKE '%Schweizer%' OR a.Make LIKE '%Bell%' OR a.Make LIKE '%Robinson%'
        OR (a.Category = 2 AND a.Power = 6)
      THEN f.minTotal ELSE 0 END), 0) AS helicopterMinutes,
    COALESCE(SUM(f.minU1 + f.minU2 + f.minU3 + f.minU4), 0) AS otherMinutes
  FROM Flight f
  LEFT JOIN Aircraft a ON f.AircraftCode = a.AircraftCode
`;

async function listFlights(options) {
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);
  const whereSql = buildWhereSql(options);

  const countRow = await runOne(
    'SELECT COUNT(*) AS total FROM Flight f LEFT JOIN Aircraft a ON f.AircraftCode = a.AircraftCode ' + whereSql
  );
  const rows = await runJsonQuery(
    FLIGHT_SELECT + ' ' + whereSql +
    ' ORDER BY f.FlightDate DESC, f.FlightCode DESC LIMIT ' + limit + ' OFFSET ' + offset
  );

  return {
    total: countRow ? countRow.total : 0,
    limit,
    offset,
    flights: rows
  };
}

async function getFlightByCode(flightCode) {
  const code = assertFlightCode(flightCode);
  return runOne(FLIGHT_SELECT + ' WHERE f.FlightCode = ' + code);
}

async function getSummary(options) {
  const whereSql = buildWhereSql(options);
  const row = await runOne(SUMMARY_SELECT + ' ' + whereSql);
  return row || emptySummaryRow();
}

/** Career / lifetime F.9 totals (optional flightTimeOnly filter only). */
async function getLifetimeAnnualResume(options) {
  const summary = await getSummary({
    flightTimeOnly: options && options.flightTimeOnly
  });
  const resume = mapSummaryToAnnualResume(summary) || {};
  return Object.assign({ scope: 'lifetime' }, resume);
}

async function getAnnualResume(options) {
  if (options && (options.from || options.to)) {
    const summary = await getSummary(options);
    const resume = mapSummaryToAnnualResume(summary) || {};
    return Object.assign({
      scope: 'range',
      from: options.from,
      to: options.to
    }, resume);
  }
  return getLifetimeAnnualResume(options);
}

async function getLatestFlightDateYmd() {
  const row = await runOne(
    'SELECT date(MAX(FlightDate)) AS latest FROM Flight WHERE minTotal > 0'
  );
  return row && row.latest ? row.latest : null;
}

async function lookupAircraftCodeByTail(tail) {
  if (!tail) {
    return 0;
  }
  const q = sqlQuote(String(tail).trim());
  const row = await runOne(
    'SELECT AircraftCode AS aircraftCode FROM Aircraft WHERE Reference = ' + q +
    ' OR Fin = ' + q + ' LIMIT 1'
  );
  return row ? row.aircraftCode : 0;
}

async function flightExistsByPairing(pairing) {
  if (!pairing) {
    return false;
  }
  const row = await runOne(
    'SELECT COUNT(*) AS n FROM Flight WHERE Pairing = ' + sqlQuote(pairing)
  );
  return row && row.n > 0;
}

async function insertFlightRecord(record) {
  const cols = [];
  const vals = [];
  Object.keys(record).forEach(key => {
    cols.push(key);
    const v = record[key];
    if (v === null || v === undefined) {
      vals.push('NULL');
    } else if (typeof v === 'number') {
      vals.push(String(v));
    } else {
      vals.push(sqlQuote(v));
    }
  });
  const sql = 'INSERT INTO Flight (' + cols.join(', ') + ') VALUES (' + vals.join(', ') + ')';
  await runExec(sql);
}

async function getStatus() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return { available: false, flightCount: 0 };
  }
  try {
    const row = await runOne(
      'SELECT COUNT(*) AS flightCount, COALESCE(SUM(minPIC),0) AS careerPicMinutes FROM Flight WHERE minTotal > 0'
    );
    return {
      available: true,
      flightCount: row ? row.flightCount : 0,
      careerPicMinutes: row ? row.careerPicMinutes : 0,
      source: 'sqlite-cli'
    };
  } catch (err) {
    return {
      available: false,
      flightCount: 0,
      error: err.message
    };
  }
}

module.exports = {
  listFlights,
  getFlightByCode,
  getSummary,
  getAnnualResume,
  getLifetimeAnnualResume,
  getStatus,
  getLatestFlightDateYmd,
  lookupAircraftCodeByTail,
  flightExistsByPairing,
  insertFlightRecord,
  addDaysYmd,
  todayYmd,
  resolveDbPath
};
