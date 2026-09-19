'use strict';

import logbook from '../../components/logbook/index';
import firebaseSync from '../../components/logbook/firebaseSync';
import postgresBackup from '../../components/logbook/postgresBackup';
import config from '../../config/environment';

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.error(err);
    const message = err && err.message ? err.message : String(err);
    res.status(statusCode).json({ error: message });
  };
}

export async function status(req, res) {
  try {
    const data = await logbook.getStatus();
    data.firebaseSync = firebaseSync.getSyncInfo();
    data.firebaseEmployeeId = config.logbook.firebaseEmployeeId || '933';
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

function queryOptions(req) {
  return {
    from: req.query.from,
    to: req.query.to,
    q: req.query.q,
    flightTimeOnly: req.query.flightTimeOnly
  };
}

export async function annualResume(req, res) {
  try {
    const opts = queryOptions(req);
    const data = (opts.from || opts.to)
      ? await logbook.getAnnualResume(opts)
      : await logbook.getLifetimeAnnualResume(opts);
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

export async function syncFirebase(req, res) {
  try {
    const employeeId = req.body && req.body.employeeId
      ? String(req.body.employeeId).trim()
      : undefined;
    const data = await firebaseSync.syncFromFirebase({ employeeId });
    const runBackup = req.body && (req.body.runBackup === true || req.body.runBackup === '1');
    if (runBackup && data.ok) {
      try {
        data.postgresBackup = await postgresBackup.runPostgresBackup();
      } catch (backupErr) {
        data.postgresBackup = {
          ok: false,
          error: backupErr.message || String(backupErr)
        };
      }
    }
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

export async function backupPostgres(req, res) {
  try {
    const data = await postgresBackup.runPostgresBackup();
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

export async function index(req, res) {
  try {
    const data = await logbook.listFlights({
      from: req.query.from,
      to: req.query.to,
      q: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
      flightTimeOnly: req.query.flightTimeOnly
    });
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

export async function summary(req, res) {
  try {
    const data = await logbook.getSummary(queryOptions(req));
    return res.status(200).json(data);
  } catch (err) {
    return handleError(res)(err);
  }
}

export async function show(req, res) {
  try {
    const row = await logbook.getFlightByCode(req.params.flightCode);
    if (!row) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    return res.status(200).json(row);
  } catch (err) {
    return handleError(res)(err);
  }
}
