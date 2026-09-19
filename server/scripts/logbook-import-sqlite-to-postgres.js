'use strict';

/**
 * One-time (or repeat) ETL: mccPilotLog SQLite → Postgres logbook schema.
 *
 *   NODE_ENV=development node server/scripts/logbook-import-sqlite-to-postgres.js
 *
 * Requires LOGBOOK_DATABASE_URL (or set in server/config/local.env.js).
 * Optional: LOGBOOK_SQLITE_PATH (default uploads/database.db)
 * Flag: --truncate  clears logbook.flights and logbook.aircraft before import
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const PROJECT_ROOT = path.join(__dirname, '../..');

function loadLocalEnv() {
  try {
    const local = require('../config/local.env');
    Object.keys(local).forEach(key => {
      if (local[key] !== undefined && process.env[key] === undefined) {
        process.env[key] = local[key];
      }
    });
  } catch (err) {
    // no local.env
  }
}

function resolveSqlitePath() {
  const rel = process.env.LOGBOOK_SQLITE_PATH || 'uploads/database.db';
  return path.isAbsolute(rel) ? rel : path.join(PROJECT_ROOT, rel);
}

async function sqliteJson(dbPath, sql) {
  const bin = process.env.SQLITE3_CLI || 'sqlite3';
  const { stdout } = await execFileAsync(bin, ['-json', dbPath, sql], {
    maxBuffer: 128 * 1024 * 1024
  });
  if (!stdout || !String(stdout).trim()) {
    return [];
  }
  return JSON.parse(stdout);
}

async function runSchema(pool) {
  const schemaPath = path.join(__dirname, '../components/logbook/schema.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(ddl);
}

async function importAircraft(pool, dbPath) {
  const rows = await sqliteJson(dbPath,
    'SELECT AircraftCode, Fin, Reference, Make, Model, Category, Power, Kg5700, FNPT FROM Aircraft'
  );
  const text =
    'INSERT INTO logbook.aircraft (aircraft_code, fin, reference, make, model, category, power, kg5700, fnpt) ' +
    'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (aircraft_code) DO UPDATE SET ' +
    'fin=EXCLUDED.fin, reference=EXCLUDED.reference, make=EXCLUDED.make, model=EXCLUDED.model, ' +
    'category=EXCLUDED.category, power=EXCLUDED.power, kg5700=EXCLUDED.kg5700, fnpt=EXCLUDED.fnpt';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await pool.query(text, [
      r.AircraftCode, r.Fin, r.Reference, r.Make, r.Model,
      r.Category, r.Power, r.Kg5700, r.FNPT
    ]);
  }
  return rows.length;
}

async function importFlights(pool, dbPath) {
  const rows = await sqliteJson(dbPath, `
    SELECT FlightCode, FlightDate, AircraftCode, DepCode, ArrCode, FlightNumber,
      DepTime, ArrTime, minTotal, minPIC, minCoP, minDual, minNight, minIFR, minXC,
      TODay, TONight, LdgDay, LdgNight, Remarks, Pairing, UserN2, PF,
      minU1, minU2, minU3, minU4
    FROM Flight ORDER BY FlightCode
  `);
  const text =
    'INSERT INTO logbook.flights (' +
    'flight_code, flight_date, aircraft_code, dep_code, arr_code, flight_number, ' +
    'dep_time, arr_time, min_total, min_pic, min_cop, min_dual, min_night, min_ifr, min_xc, ' +
    'to_day, to_night, ldg_day, ldg_night, remarks, pairing, user_n2, pf, ' +
    'min_u1, min_u2, min_u3, min_u4) VALUES (' +
    '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27' +
    ') ON CONFLICT (flight_code) DO UPDATE SET ' +
    'flight_date=EXCLUDED.flight_date, min_total=EXCLUDED.min_total, min_pic=EXCLUDED.min_pic, ' +
    'remarks=EXCLUDED.remarks, pairing=EXCLUDED.pairing';

  const batchSize = 200;
  for (let start = 0; start < rows.length; start += batchSize) {
    const slice = rows.slice(start, start + batchSize);
    for (let j = 0; j < slice.length; j++) {
      const r = slice[j];
      await pool.query(text, [
        r.FlightCode, r.FlightDate, r.AircraftCode, r.DepCode, r.ArrCode, r.FlightNumber,
        r.DepTime, r.ArrTime, r.minTotal, r.minPIC, r.minCoP, r.minDual, r.minNight, r.minIFR, r.minXC,
        r.TODay, r.TONight, r.LdgDay, r.LdgNight, r.Remarks, r.Pairing, r.UserN2, r.PF ? 1 : 0,
        r.minU1, r.minU2, r.minU3, r.minU4
      ]);
    }
    process.stdout.write('  flights ' + Math.min(start + batchSize, rows.length) + '/' + rows.length + '\n');
  }
  return rows.length;
}

async function main() {
  loadLocalEnv();
  if (!process.env.LOGBOOK_DATABASE_URL) {
    if (process.env.SEQUELIZE_URI) {
      process.env.LOGBOOK_DATABASE_URL = process.env.SEQUELIZE_URI;
      console.log('Using SEQUELIZE_URI as LOGBOOK_DATABASE_URL');
    } else {
      console.error('Set LOGBOOK_DATABASE_URL (or SEQUELIZE_URI in local.env.js)');
      process.exit(1);
    }
  }

  const dbPath = resolveSqlitePath();
  if (!fs.existsSync(dbPath)) {
    console.error('SQLite not found:', dbPath);
    process.exit(1);
  }

  const pg = require('pg');
  const pool = new pg.Pool({ connectionString: process.env.LOGBOOK_DATABASE_URL });
  const truncate = process.argv.indexOf('--truncate') >= 0;

  try {
    console.log('Applying schema…');
    await runSchema(pool);
    if (truncate) {
      console.log('Truncating logbook tables…');
      await pool.query('TRUNCATE logbook.flights, logbook.aircraft');
    }
    console.log('Importing aircraft…');
    const acCount = await importAircraft(pool, dbPath);
    console.log('  aircraft', acCount);
    console.log('Importing flights…');
    const flCount = await importFlights(pool, dbPath);
    const verify = await pool.query('SELECT COUNT(*)::int AS n FROM logbook.flights');
    console.log('Done. logbook.flights row count:', verify.rows[0].n, '(source rows', flCount + ')');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
