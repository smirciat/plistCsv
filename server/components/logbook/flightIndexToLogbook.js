'use strict';

const SunCalc = require('suncalc');

const DEFAULT_PLANE_MAP = [
  { code: 17, aircraft: 'N241BA' },
  { code: 18, aircraft: 'N952BA' },
  { code: 19, aircraft: 'N573BA' },
  { code: 20, aircraft: 'N404BA' },
  { code: 21, aircraft: 'N215BA' },
  { code: 22, aircraft: 'N996BA' },
  { code: 23, aircraft: 'N867BA' },
  { code: 24, aircraft: 'N848BA' },
  { code: 25, aircraft: 'N679BA' },
  { code: 26, aircraft: 'N610BA' },
  { code: 124, aircraft: 'N208NP' },
  { code: 125, aircraft: 'N772BA' },
  { code: 126, aircraft: 'N321BA' },
  { code: 127, aircraft: 'N190BA' },
  { code: 128, aircraft: 'N759BA' },
  { code: 129, aircraft: 'N994BA' },
  { code: 130, aircraft: 'N171CJ' },
  { code: 131, aircraft: 'N148SK' },
  { code: 132, aircraft: 'N15GA' },
  { code: 133, aircraft: 'N954LE' }
];

let airportsCache;

function defaultEmpNum() {
  return process.env.LOGBOOK_FIREBASE_EMPLOYEE_ID || '933';
}

async function loadAirportsForLogbook() {
  if (airportsCache) {
    return airportsCache;
  }
  const sqldb = require('../../sqldb');
  const Airport = sqldb.Airport;
  const rows = await Airport.findAll({
    attributes: ['threeLetter', 'latitude', 'longitude'],
    raw: true
  });
  airportsCache = rows || [];
  return airportsCache;
}

function convertToDate(string) {
  if (!string || string === '') {
    return null;
  }
  const stringArr = String(string).split('T');
  if (stringArr.length === 2) {
    return new Date(stringArr[0] + ' ' + stringArr[1]);
  }
  return new Date(string);
}

function isBetweenExclusive(d, start, end) {
  if (!d || !start || !end || isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

function minutesUntil(later, earlier) {
  return Math.floor((later.getTime() - earlier.getTime()) / 60000);
}

function findAirport(airports, threeLetter) {
  if (!airports || !threeLetter) {
    return null;
  }
  for (let i = 0; i < airports.length; i++) {
    if (airports[i].threeLetter === threeLetter) {
      return airports[i];
    }
  }
  return null;
}

function hubDepArrCodes(route) {
  const dep = route && route.length ? route[0] : '';
  const arr = route && route.length ? route[route.length - 1] : '';
  let depCode = -21188;
  let arrCode = -21188;
  if (dep === 'OTZ') {
    depCode = -21191;
  }
  if (arr === 'OTZ') {
    arrCode = -21191;
  }
  return { depCode, arrCode };
}

function formatRouteRemarks(route) {
  if (!route || !route.length) {
    return '';
  }
  return '-' + route.join('-');
}

function landingsFromRoute(route, aircraftCode) {
  if (!route || route.length < 2) {
    return 0;
  }
  if (aircraftCode >= 130 && aircraftCode <= 133) {
    return Math.floor((route.length - 1) / 2) + 1;
  }
  return route.length - 1;
}

function aircraftCodeFromPlaneMap(tail, planeMap) {
  let code = 17;
  for (let i = 0; i < planeMap.length; i++) {
    if (planeMap[i].aircraft === tail) {
      code = planeMap[i].code;
      break;
    }
  }
  return code;
}

function capNight(flightInfo) {
  if (flightInfo.night > flightInfo.flightTimeMinutes) {
    flightInfo.night = flightInfo.flightTimeMinutes;
  }
}

function finalizeTakeoffLandingCounts(flightInfo) {
  if (flightInfo.dayTO === 0) {
    flightInfo.dayTO = flightInfo.dayTOMulti;
  }
  if (flightInfo.nightTO === 0) {
    flightInfo.nightTO = flightInfo.nightTOMulti;
  }
  if (flightInfo.dayLND === 0) {
    flightInfo.dayLND = flightInfo.dayLNDMulti;
  }
  if (flightInfo.nightLND === 0) {
    flightInfo.nightLND = flightInfo.nightLNDMulti;
  }
}

/**
 * Port of main.controller buildFlightInfo() for one flightIndex row → mccPilotLog insert shape.
 * Returns null when the row should be skipped (no tail/time or non-PIC PFR).
 */
function buildLogbookRecordFromPlistRow(row, options) {
  const airports = options.airports || [];
  const planeMap = options.planeMap || DEFAULT_PLANE_MAP;
  const empNum = options.empNum != null ? String(options.empNum) : defaultEmpNum();
  const logbookAircraftCode = options.logbookAircraftCode || 0;

  if (!row || !row.acftNumber || !row.flightTime) {
    return null;
  }

  const digits = empNum.length > 3 ? 4 : empNum.length;
  if (empNum !== '' && row.pfrNumber &&
    empNum.substring(0, digits) !== String(row.pfrNumber).substring(0, digits)) {
    return null;
  }

  const flightDate = new Date(row.date);
  if (isNaN(flightDate.getTime())) {
    return null;
  }

  const month = flightDate.getMonth() + 1;
  const day = flightDate.getDate();
  const dateString = flightDate.getFullYear() + '-' +
    (month < 10 ? '0' : '') + month + '-' +
    (day < 10 ? '0' : '') + day;

  const route = Array.isArray(row.route) ? row.route : [];
  const aircraft = row.acftNumber;
  const aircraftCode = logbookAircraftCode || aircraftCodeFromPlaneMap(aircraft, planeMap);
  const codes = hubDepArrCodes(route);
  const onOffArray = row.legTimesArray || [];

  const flightInfo = {
    dateString,
    aircraft,
    aircraftCode,
    routeArray: route,
    flightTimeMinutes: parseInt(row.flightTime, 10) || 0,
    flightNumber: row.flightNumber ? String(row.flightNumber) : '',
    intermediates: '-',
    departure: route[0],
    destination: route[route.length - 1],
    departureCode: codes.depCode,
    destinationCode: codes.arrCode,
    night: 0,
    dayTO: 0,
    dayLND: 0,
    nightTO: 0,
    nightLND: 0,
    dayTOMulti: 0,
    dayLNDMulti: 0,
    nightTOMulti: 0,
    nightLNDMulti: 0
  };

  if (route.length > 1) {
    for (let i = 1; i < route.length - 1; i++) {
      flightInfo.intermediates = flightInfo.intermediates + (i === 1 ? '' : '-') + route[i];
    }
  }

  const legTemplate = JSON.parse(JSON.stringify(flightInfo));
  onOffArray.forEach((element, index) => {
    if (!element.off || !element.on) {
      return;
    }
    const legInfo = JSON.parse(JSON.stringify(legTemplate));
    legInfo.intermediates = '-';
    legInfo.flightTimeMinutes = (new Date(element.on) - new Date(element.off)) / (1000 * 60);
    legInfo.departure = legInfo.routeArray[index];
    legInfo.destination = legInfo.routeArray[index + 1];
    legInfo.night = 0;
    legInfo.dayTO = 0;
    legInfo.dayLND = 0;
    legInfo.nightTO = 0;
    legInfo.nightLND = 0;
    legInfo.dayTOMulti = 0;
    legInfo.dayLNDMulti = 0;
    legInfo.nightTOMulti = 0;
    legInfo.nightLNDMulti = 0;

    const momentOff = convertToDate(element.off);
    const momentOn = convertToDate(element.on);
    const depAp = findAirport(airports, legInfo.departure);

    if (depAp && depAp.latitude && depAp.longitude) {
      const lat = parseFloat(depAp.latitude);
      const lng = parseFloat(depAp.longitude);
      const times = SunCalc.getTimes(new Date(element.off), lat, lng);
      const dawn = times.dawn;
      const dusk = times.dusk;
      const sunrise = new Date(times.sunrise.getTime() - 60 * 60 * 1000);
      const sunset = new Date(times.sunset.getTime() + 60 * 60 * 1000);

      const offNight = !isBetweenExclusive(momentOff, dawn, dusk);
      const offNightLnd = !isBetweenExclusive(momentOff, sunrise, sunset);

      let onNight = false;
      let onNightLnd = false;
      const arrAp = findAirport(airports, legInfo.destination);
      if (arrAp && arrAp.latitude && arrAp.longitude) {
        const times1 = SunCalc.getTimes(new Date(element.on),
          parseFloat(arrAp.latitude), parseFloat(arrAp.longitude));
        const dawn1 = times1.dawn;
        const dusk1 = times1.dusk;
        const sunrise1 = new Date(times1.sunrise.getTime() - 60 * 60 * 1000);
        const sunset1 = new Date(times1.sunset.getTime() + 60 * 60 * 1000);
        onNight = !isBetweenExclusive(momentOn, dawn1, dusk1);
        onNightLnd = !isBetweenExclusive(momentOn, sunrise1, sunset1);
      }

      if (offNightLnd) {
        if (flightInfo.aircraftCode < 130 || flightInfo.aircraftCode > 133) {
          legInfo.nightTO++;
        } else {
          legInfo.nightTOMulti++;
        }
      } else if (flightInfo.aircraftCode < 130 || flightInfo.aircraftCode > 133) {
        legInfo.dayTO++;
      } else {
        legInfo.dayTOMulti++;
      }

      if (offNight) {
        if (onNight) {
          legInfo.night = legInfo.flightTimeMinutes;
        } else {
          legInfo.night = minutesUntil(dawn, momentOff);
        }
      } else if (onNight) {
        legInfo.night = minutesUntil(momentOn, dusk);
      }

      if (onNightLnd) {
        if (flightInfo.aircraftCode < 130 || flightInfo.aircraftCode > 133) {
          legInfo.nightLND++;
        } else {
          legInfo.nightLNDMulti++;
        }
      } else if (flightInfo.aircraftCode < 130 || flightInfo.aircraftCode > 133) {
        legInfo.dayLND++;
      } else {
        legInfo.dayLNDMulti++;
      }
    } else if (flightInfo.aircraftCode < 130 || flightInfo.aircraftCode > 133) {
      legInfo.dayTO++;
      legInfo.dayLND++;
    } else {
      legInfo.dayTOMulti++;
      legInfo.dayLNDMulti++;
    }

    flightInfo.night += legInfo.night;
    flightInfo.dayTO += legInfo.dayTO;
    flightInfo.dayLND += legInfo.dayLND;
    flightInfo.nightTO += legInfo.nightTO;
    flightInfo.nightLND += legInfo.nightLND;
    flightInfo.dayTOMulti += legInfo.dayTOMulti;
    flightInfo.dayLNDMulti += legInfo.dayLNDMulti;
    flightInfo.nightTOMulti += legInfo.nightTOMulti;
    flightInfo.nightLNDMulti += legInfo.nightLNDMulti;
  });

  if (flightInfo.flightTimeMinutes <= 0) {
    return null;
  }

  capNight(flightInfo);
  finalizeTakeoffLandingCounts(flightInfo);

  const landings = landingsFromRoute(route, aircraftCode);
  const minutes = flightInfo.flightTimeMinutes;
  const pairing = row.pfrNumber ? String(row.pfrNumber) : '';

  return {
    FlightDate: dateString + ' 00:00:00',
    AircraftCode: aircraftCode || 0,
    DepCode: codes.depCode,
    ArrCode: codes.arrCode,
    FlightNumber: flightInfo.flightNumber,
    minTotal: minutes,
    minPIC: minutes,
    minCoP: 0,
    minDual: 0,
    minXC: minutes,
    minIFR: minutes,
    minNight: Math.round(flightInfo.night) || 0,
    TODay: flightInfo.dayTO,
    TONight: flightInfo.nightTO,
    LdgDay: flightInfo.dayLND,
    LdgNight: flightInfo.nightLND,
    Remarks: formatRouteRemarks(route),
    Pairing: pairing,
    PF: 1
  };
}

module.exports = {
  buildLogbookRecordFromPlistRow,
  loadAirportsForLogbook,
  DEFAULT_PLANE_MAP,
  formatRouteRemarks,
  landingsFromRoute,
  hubDepArrCodes
};
