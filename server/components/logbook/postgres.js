'use strict';

const pg = require('pg');
const { assertYmd, addDaysYmd, todayYmd } = require('./dates');
const { emptySummaryRow, mapSummaryToAnnualResume } = require('./summaryHelpers');

let pool;

function connectionString() {
  const url = process.env.LOGBOOK_DATABASE_URL;
  if (!url || !String(url).trim()) {
    throw new Error('LOGBOOK_DATABASE_URL is not set');
  }
  return String(url).trim();
}

function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: connectionString() });
  }
  return pool;
}

function assertFlightCode(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Invalid flight code');
  }
  return n;
}

const FLIGHT_SELECT = `
  SELECT
    f.flight_code AS "flightCode",
    f.flight_date AS "flightDate",
    f.flight_number AS "flightNumber",
    f.min_total AS "minTotal",
    f.min_pic AS "minPIC",
    f.min_night AS "minNight",
    f.min_ifr AS "minIFR",
    f.min_xc AS "minXC",
    f.to_day AS "toDay",
    f.to_night AS "toNight",
    f.ldg_day AS "ldgDay",
    f.ldg_night AS "ldgNight",
    f.dep_time AS "depTime",
    f.arr_time AS "arrTime",
    f.remarks AS "remarks",
    f.dep_code AS "depCode",
    f.arr_code AS "arrCode",
    f.pairing AS "pairing",
    f.user_n2 AS "userN2",
    f.pf AS "pf",
    COALESCE(NULLIF(a.fin, ''), a.reference) AS "aircraft",
    a.make AS "aircraftMake",
    a.model AS "aircraftModel"
  FROM logbook.flights f
  LEFT JOIN logbook.aircraft a ON f.aircraft_code = a.aircraft_code
`;

const SUMMARY_SELECT = `
  SELECT
    COUNT(*)::int AS "flights",
    COALESCE(SUM(f.min_total), 0)::int AS "minTotal",
    COALESCE(SUM(f.min_pic), 0)::int AS "minPIC",
    COALESCE(SUM(f.min_cop), 0)::int AS "minCoP",
    COALESCE(SUM(f.min_dual), 0)::int AS "minDual",
    COALESCE(SUM(f.min_night), 0)::int AS "minNight",
    COALESCE(SUM(f.min_xc), 0)::int AS "minXC",
    COALESCE(SUM(CASE WHEN f.min_xc > 0 THEN f.min_night ELSE 0 END), 0)::int AS "minNightXC",
    COALESCE(SUM(f.min_ifr), 0)::int AS "minIFR",
    COALESCE(SUM(f.to_day + f.to_night), 0)::int AS "takeoffs",
    COALESCE(SUM(f.ldg_day + f.ldg_night), 0)::int AS "landings",
    COALESCE(SUM(CASE WHEN a.power IN (2, 4, 5, 6) THEN f.min_total ELSE 0 END), 0)::int AS "turbineMinutes",
    COALESCE(SUM(CASE WHEN COALESCE(a.kg5700, 0) = 1 OR a.model LIKE '%1900%' THEN f.min_total ELSE 0 END), 0)::int AS "melMinutes",
    COALESCE(SUM(CASE WHEN a.category = 1 AND a.power = 2 AND COALESCE(a.kg5700, 0) = 0 THEN f.min_total ELSE 0 END), 0)::int AS "selMinutes",
    COALESCE(SUM(CASE WHEN COALESCE(a.fnpt, 0) > 0 OR a.make = 'ATC' THEN f.min_total ELSE 0 END), 0)::int AS "simulatorMinutes",
    COALESCE(SUM(CASE
      WHEN a.make LIKE '%Schweizer%' OR a.make LIKE '%Bell%' OR a.make LIKE '%Robinson%'
        OR (a.category = 2 AND a.power = 6)
      THEN f.min_total ELSE 0 END), 0)::int AS "helicopterMinutes",
    COALESCE(SUM(f.min_u1 + f.min_u2 + f.min_u3 + f.min_u4), 0)::int AS "otherMinutes"
  FROM logbook.flights f
  LEFT JOIN logbook.aircraft a ON f.aircraft_code = a.aircraft_code
`;

function buildWhereClause(options) {
  const parts = [];
  const params = [];
  let idx = 1;

  if (options.from) {
    assertYmd(options.from, 'from');
    parts.push('f.flight_date::date >= $' + idx + '::date');
    params.push(options.from);
    idx++;
  }
  if (options.to) {
    assertYmd(options.to, 'to');
    parts.push('f.flight_date::date <= $' + idx + '::date');
    params.push(options.to);
    idx++;
  }
  if (options.q) {
    const like = '%' + String(options.q).replace(/'/g, '') + '%';
    parts.push(
      '(f.flight_number ILIKE $' + idx +
      ' OR f.remarks ILIKE $' + idx +
      ' OR a.fin ILIKE $' + idx +
      ' OR a.reference ILIKE $' + idx + ')'
    );
    params.push(like);
    idx++;
  }
  if (options.flightTimeOnly === true || options.flightTimeOnly === 'true' || options.flightTimeOnly === '1') {
    parts.push('f.min_total > 0');
  }

  const sql = parts.length ? 'WHERE ' + parts.join(' AND ') : '';
  return { sql, params };
}

async function query(text, params) {
  const result = await getPool().query(text, params);
  return result;
}

async function listFlights(options) {
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);
  const where = buildWhereClause(options);

  const countResult = await query(
    'SELECT COUNT(*)::int AS total FROM logbook.flights f LEFT JOIN logbook.aircraft a ON f.aircraft_code = a.aircraft_code ' +
    where.sql,
    where.params
  );
  const listParams = where.params.concat([limit, offset]);
  const limitIdx = where.params.length + 1;
  const offsetIdx = where.params.length + 2;
  const rowsResult = await query(
    FLIGHT_SELECT + ' ' + where.sql +
    ' ORDER BY f.flight_date DESC, f.flight_code DESC LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx,
    listParams
  );

  return {
    total: countResult.rows[0] ? countResult.rows[0].total : 0,
    limit,
    offset,
    flights: rowsResult.rows
  };
}

async function getFlightByCode(flightCode) {
  const code = assertFlightCode(flightCode);
  const result = await query(FLIGHT_SELECT + ' WHERE f.flight_code = $1', [code]);
  return result.rows[0] || null;
}

async function getSummary(options) {
  const where = buildWhereClause(options);
  const result = await query(SUMMARY_SELECT + ' ' + where.sql, where.params);
  return result.rows[0] || emptySummaryRow();
}

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
  const result = await query(
    'SELECT to_char(MAX(flight_date)::date, \'YYYY-MM-DD\') AS latest FROM logbook.flights WHERE min_total > 0'
  );
  const row = result.rows[0];
  return row && row.latest ? row.latest : null;
}

async function lookupAircraftCodeByTail(tail) {
  if (!tail) {
    return 0;
  }
  const result = await query(
    'SELECT aircraft_code AS "aircraftCode" FROM logbook.aircraft WHERE reference = $1 OR fin = $1 LIMIT 1',
    [String(tail).trim()]
  );
  return result.rows[0] ? result.rows[0].aircraftCode : 0;
}

async function flightExistsByPairing(pairing) {
  if (!pairing) {
    return false;
  }
  const result = await query(
    'SELECT COUNT(*)::int AS n FROM logbook.flights WHERE pairing = $1',
    [String(pairing)]
  );
  return result.rows[0] && result.rows[0].n > 0;
}

const SQLITE_TO_PG = {
  FlightDate: 'flight_date',
  AircraftCode: 'aircraft_code',
  DepCode: 'dep_code',
  ArrCode: 'arr_code',
  FlightNumber: 'flight_number',
  minTotal: 'min_total',
  minPIC: 'min_pic',
  minCoP: 'min_cop',
  minDual: 'min_dual',
  minNight: 'min_night',
  minXC: 'min_xc',
  minIFR: 'min_ifr',
  TODay: 'to_day',
  LdgDay: 'ldg_day',
  TONight: 'to_night',
  LdgNight: 'ldg_night',
  Remarks: 'remarks',
  Pairing: 'pairing',
  PF: 'pf'
};

async function insertFlightRecord(record) {
  const nextCode = await query('SELECT COALESCE(MAX(flight_code), 0) + 1 AS n FROM logbook.flights');
  const flightCode = nextCode.rows[0].n;
  const cols = ['flight_code'];
  const vals = ['$1'];
  const params = [flightCode];
  let i = 2;

  Object.keys(record).forEach(key => {
    const col = SQLITE_TO_PG[key] || key;
    if (col === 'flight_code') {
      return;
    }
    cols.push(col);
    vals.push('$' + i);
    params.push(record[key]);
    i++;
  });

  await query(
    'INSERT INTO logbook.flights (' + cols.join(', ') + ') VALUES (' + vals.join(', ') + ')',
    params
  );
  return flightCode;
}

async function getStatus() {
  try {
    const result = await query(
      'SELECT COUNT(*)::int AS "flightCount", COALESCE(SUM(min_pic),0)::int AS "careerPicMinutes" FROM logbook.flights WHERE min_total > 0'
    );
    const row = result.rows[0];
    return {
      available: true,
      flightCount: row ? row.flightCount : 0,
      careerPicMinutes: row ? row.careerPicMinutes : 0,
      source: 'postgres'
    };
  } catch (err) {
    return {
      available: false,
      flightCount: 0,
      error: err.message,
      source: 'postgres'
    };
  }
}

function resolveDbPath() {
  return connectionString();
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
  resolveDbPath,
  getPool,
  connectionString
};
