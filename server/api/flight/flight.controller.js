'use strict';

import {
  queryFlightsByPilotEmployeeNumber,
  queryFlightsForEmployee,
  fetchFlightIndexPlistRows
} from '../../components/firebase';

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.error(err);
    const message = err && err.message ? err.message : String(err);
    res.status(statusCode).json({ error: message });
  };
}

function parseLimit(raw) {
  const limit = parseInt(raw, 10);
  if (!limit || limit < 1) return 500;
  return Math.min(limit, 8000);
}

/**
 * GET /api/flights/flight-index/:employeeId?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Flight Report flightIndex rows in plist shape for main buildFlightInfo() / CSV.
 */
export async function flightIndexPlist(req, res) {
  const employeeId = req.params.employeeId;
  const start = req.query.start;
  const end = req.query.end;
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId required' });
  }
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params required (YYYY-MM-DD)' });
  }
  try {
    const rows = await fetchFlightIndexPlistRows(employeeId, start, end);
    return res.status(200).json(rows);
  } catch (err) {
    return handleError(res)(err);
  }
}

/** GET /api/flights/by-employee/:employeeId — Firestore flights, date desc */
export async function byEmployee(req, res) {
  const employeeId = req.params.employeeId;
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId required' });
  }
  const limit = parseLimit(req.query.limit);
  const seat = (req.query.seat || 'pic').toLowerCase();

  try {
    const flights = seat === 'any'
      ? await queryFlightsForEmployee(employeeId, limit)
      : await queryFlightsByPilotEmployeeNumber(employeeId, limit);
    return res.status(200).json(flights);
  } catch (err) {
    return handleError(res)(err);
  }
}
