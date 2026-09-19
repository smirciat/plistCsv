'use strict';

function emptySummaryRow() {
  return {
    flights: 0, minTotal: 0, minPIC: 0, minCoP: 0, minDual: 0, minNight: 0,
    minXC: 0, minNightXC: 0, minIFR: 0, landings: 0, takeoffs: 0,
    turbineMinutes: 0, melMinutes: 0, selMinutes: 0, simulatorMinutes: 0,
    helicopterMinutes: 0, otherMinutes: 0
  };
}

function mapSummaryToAnnualResume(row) {
  if (!row) {
    return null;
  }
  const pic = row.minPIC || 0;
  const sic = row.minCoP || 0;
  const dual = row.minDual || 0;
  const total = pic + sic + dual;
  return {
    flights: row.flights || 0,
    minTotal: row.minTotal || 0,
    landings: row.landings || 0,
    takeoffs: row.takeoffs || 0,
    form: {
      'PIC Hours': pic,
      'SIC Hours': sic,
      'Dual received': dual,
      TOTAL: total,
      Night: row.minNight || 0,
      'XC Hours': row.minXC || 0,
      'Night XC Hours': row.minNightXC || 0,
      'Actual Instrument Hours': row.minIFR || 0,
      'Turbine Hours': row.turbineMinutes || 0,
      'SEL Hours': row.selMinutes || 0,
      'MEL Hours': row.melMinutes || 0,
      'Helicopter Hours': row.helicopterMinutes || 0,
      'Simulator Hours': row.simulatorMinutes || 0,
      'Other Flight Time': row.otherMinutes || 0
    }
  };
}

module.exports = {
  emptySummaryRow,
  mapSummaryToAnnualResume
};
