'use strict';

function usePostgres() {
  const url = process.env.LOGBOOK_DATABASE_URL;
  return !!(url && String(url).trim());
}

module.exports = usePostgres() ? require('./postgres') : require('./sqlite');
