'use strict';

const { getFirestore } = require('./admin');

const INDEX_COLLECTIONS = ['flightIndex', 'flightIndexBeta'];

function timestampToIso(value) {
  if (!value) {
    return value;
  }
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value._seconds !== undefined) {
    return new Date(value._seconds * 1000).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function docDateMs(data) {
  const raw = data && data.date;
  if (!raw) {
    return 0;
  }
  if (raw._seconds !== undefined) {
    return raw._seconds * 1000;
  }
  if (raw.toDate) {
    return raw.toDate().getTime();
  }
  return new Date(raw).getTime();
}

function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) {
    return null;
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

function mapLegTimesArray(legTimesArray) {
  if (!legTimesArray || !legTimesArray.length) {
    return [];
  }
  return legTimesArray.map(leg => ({
    inFlight: leg.inFlight,
    off: timestampToIso(leg.off),
    on: timestampToIso(leg.on)
  }));
}

/**
 * One flightIndex doc → row shape expected by client buildFlightInfo() (Flight Report plist).
 */
function mapDocToPlistRow(docId, data) {
  return {
    flightNumber: data.flightNumber != null ? String(data.flightNumber) : '',
    acftNumber: data.acftNumber || '',
    route: Array.isArray(data.route) ? data.route : [],
    date: timestampToIso(data.date),
    pfrNumber: data.pfrNumber || docId || '',
    flightTime: data.flightTime || 0,
    flightTimeString: data.flightTimeString || '',
    standbyTime: data.standbyTime || 0,
    standbyTimeString: data.standbyTimeString || '',
    legTimesArray: mapLegTimesArray(data.legTimesArray),
    flightBeganString: data.flightBeganString || '',
    flightEndedString: data.flightEndedString || '',
    flightBeganDate: timestampToIso(data.flightBeganDate),
    flightEndedDate: timestampToIso(data.flightEndedDate),
    dutyDayType: data.dutyDayType,
    dutyDayIsAssigned: data.dutyDayIsAssigned,
    isOnDuty: data.isOnDuty,
    isOffDuty: data.isOffDuty
  };
}

/**
 * Load pilots/{employeeId}/flightIndex (+ Beta), filter inclusive date range, plist-shaped JSON.
 */
async function fetchFlightIndexPlistRows(employeeId, startYmd, endYmd) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) {
    throw new Error('start and end required as YYYY-MM-DD');
  }
  if (end < start) {
    throw new Error('end must be on or after start');
  }
  const rangeStartMs = start.getTime();
  const rangeEndMs = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23, 59, 59, 999
  ).getTime();

  const db = getFirestore();
  const pilotRef = db.collection('pilots').doc(String(employeeId));
  const seen = {};
  const rows = [];

  for (let c = 0; c < INDEX_COLLECTIONS.length; c++) {
    const colName = INDEX_COLLECTIONS[c];
    const snap = await pilotRef.collection(colName).get();
    snap.forEach(doc => {
      if (seen[doc.id]) {
        return;
      }
      seen[doc.id] = true;
      const data = doc.data();
      const ms = docDateMs(data);
      if (!ms || ms < rangeStartMs || ms > rangeEndMs) {
        return;
      }
      rows.push(mapDocToPlistRow(doc.id, data));
    });
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

module.exports = {
  fetchFlightIndexPlistRows,
  mapDocToPlistRow
};
