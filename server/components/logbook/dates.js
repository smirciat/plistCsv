'use strict';

function assertYmd(value, label) {
  if (!value) {
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new Error('Invalid ' + label + ' (use YYYY-MM-DD)');
  }
}

function addDaysYmd(ymd, days) {
  assertYmd(ymd, 'date');
  const parts = String(ymd).split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

module.exports = {
  assertYmd,
  addDaysYmd,
  todayYmd
};
