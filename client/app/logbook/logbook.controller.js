'use strict';

(function() {

class LogbookController {
  constructor($http, moment) {
    this.http = $http;
    this.moment = moment;
    const now = new Date();
    this.filterTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.filterFrom = new Date(now.getFullYear(), 0, 1);
    this.queryPreset = 'calendarYear';
    this.calendarYear = now.getFullYear();
    this.searchText = '';
    this.flightTimeOnly = true;
    this.limit = 100;
    this.offset = 0;
    this.total = 0;
    this.flights = [];
    this.summary = null;
    this.annualResume = null;
    this.loading = false;
    this.status = null;
    this.error = null;
    this.syncing = false;
    this.syncMessage = null;
    this.backupAfterImport = true;
    this.backingUp = false;
    this.backupMessage = null;
    this.annualFieldOrder = [
      'PIC Hours', 'SIC Hours', 'Dual received', 'TOTAL',
      'SEL Hours', 'MEL Hours', 'Turbine Hours', 'Helicopter Hours',
      'Night', 'XC Hours', 'Night XC Hours', 'Actual Instrument Hours',
      'Simulator Hours', 'Other Flight Time'
    ];
    this.periodPresets = [
      { id: 'custom', label: 'Custom date range' },
      { id: 'calendarYear', label: 'Calendar year' },
      { id: 'priorCalendarYear', label: 'Prior calendar year' },
      { id: 'past90', label: 'Past 90 days' },
      { id: 'past180', label: 'Past 180 days' }
    ];
  }

  $onInit() {
    this.applyPresetDates();
    this.loadStatus();
    this.loadLifetimeAnnualResume();
    this.search();
  }

  loadStatus() {
    this.http.get('/api/logbook/status').then(res => {
      this.status = res.data;
    });
  }

  loadLifetimeAnnualResume() {
    this.http.get('/api/logbook/annual-resume', {
      params: { flightTimeOnly: this.flightTimeOnly ? '1' : '0' }
    }).then(res => {
      this.annualResume = res.data;
    });
  }

  syncFromFirebase() {
    this.syncing = true;
    this.syncMessage = null;
    this.backupMessage = null;
    this.error = null;
    const body = { runBackup: this.backupAfterImport };
    this.http.post('/api/logbook/sync-firebase', body).then(res => {
      this.syncing = false;
      const data = res.data || {};
      if (data.message && !data.imported) {
        this.syncMessage = data.message;
      } else {
        this.syncMessage = 'Imported ' + (data.imported || 0) + ' flight(s) from Firebase (' +
          (data.startYmd || '?') + ' to ' + (data.endYmd || '?') + ').';
      }
      this.applyBackupResult(data.postgresBackup);
      this.loadStatus();
      this.loadLifetimeAnnualResume();
      this.search();
    }).catch(err => {
      this.syncing = false;
      this.error = (err.data && err.data.error) ? err.data.error : 'Firebase sync failed';
    });
  }

  backupPostgres() {
    this.backingUp = true;
    this.backupMessage = null;
    this.error = null;
    this.http.post('/api/logbook/backup-postgres', {}).then(res => {
      this.backingUp = false;
      this.applyBackupResult(res.data);
    }).catch(err => {
      this.backingUp = false;
      this.error = (err.data && err.data.error) ? err.data.error : 'Postgres backup failed';
    });
  }

  applyBackupResult(backup) {
    if (!backup) {
      return;
    }
    if (backup.ok) {
      this.backupMessage = backup.summary || 'Postgres backup finished (local + bering-vultr).';
    } else {
      this.backupMessage = 'Backup failed: ' + (backup.error || 'unknown error');
    }
  }

  showPostgresBackup() {
    return this.status && this.status.source === 'postgres';
  }

  formatSyncTime(iso) {
    if (!iso) {
      return 'never';
    }
    return this.moment(iso).format('YYYY-MM-DD HH:mm');
  }

  isCustomPeriod() {
    return this.queryPreset === 'custom';
  }

  onPresetChange() {
    this.applyPresetDates();
    if (!this.isCustomPeriod()) {
      this.offset = 0;
      this.search();
    }
  }

  onCalendarYearChange() {
    if (this.queryPreset !== 'calendarYear') {
      return;
    }
    this.applyPresetDates();
    this.offset = 0;
    this.search();
  }

  applyPresetDates() {
    const m = this.moment;
    const today = m().startOf('day');
    let from;
    let to = today.clone();

    switch (this.queryPreset) {
      case 'calendarYear':
        from = m({ year: this.calendarYear, month: 0, day: 1 });
        to = m({ year: this.calendarYear, month: 11, day: 31 });
        break;
      case 'priorCalendarYear': {
        const y = today.year() - 1;
        from = m({ year: y, month: 0, day: 1 });
        to = m({ year: y, month: 11, day: 31 });
        break;
      }
      case 'past90':
        from = today.clone().subtract(89, 'days');
        break;
      case 'past180':
        from = today.clone().subtract(179, 'days');
        break;
      default:
        return;
    }

    this.filterFrom = from.toDate();
    this.filterTo = to.toDate();
  }

  priorCalendarYearLabel() {
    return new Date().getFullYear() - 1;
  }

  rangeLabel() {
    return this.formatDate(this.filterFrom) + ' to ' + this.formatDate(this.filterTo);
  }

  presetLabel() {
    const preset = this.periodPresets.find(p => p.id === this.queryPreset);
    if (!preset) {
      return '';
    }
    if (this.queryPreset === 'calendarYear') {
      return preset.label + ' (' + this.calendarYear + ')';
    }
    if (this.queryPreset === 'priorCalendarYear') {
      return preset.label + ' (' + this.priorCalendarYearLabel() + ')';
    }
    return preset.label;
  }

  queryParams() {
    const params = {
      from: this.moment(this.filterFrom).format('YYYY-MM-DD'),
      to: this.moment(this.filterTo).format('YYYY-MM-DD'),
      flightTimeOnly: this.flightTimeOnly ? '1' : '0'
    };
    if (this.searchText && this.searchText.trim()) {
      params.q = this.searchText.trim();
    }
    return params;
  }

  runSearch() {
    if (!this.isCustomPeriod()) {
      this.applyPresetDates();
    }
    this.offset = 0;
    this.loadLifetimeAnnualResume();
    this.search();
  }

  search() {
    this.loading = true;
    this.error = null;
    const params = this.queryParams();
    const listParams = Object.assign({ limit: this.limit, offset: this.offset }, params);

    this.http.get('/api/logbook/flights', { params: listParams }).then(res => {
      this.flights = res.data.flights || [];
      this.total = res.data.total || 0;
      this.loading = false;
    }).catch(err => {
      this.loading = false;
      this.error = (err.data && err.data.error) ? err.data.error : 'Could not load logbook';
    });

    this.http.get('/api/logbook/summary', { params }).then(res => {
      this.summary = res.data;
    });
  }

  formatDate(d) {
    return this.moment(d).format('YYYY-MM-DD');
  }

  formatMinutes(mins) {
    const m = parseInt(mins, 10);
    if (!m) return '0:00';
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h + ':' + (r < 10 ? '0' : '') + r;
  }

  /** Decimal hours (mccPilotLog stores minutes). */
  formatHours(mins) {
    const m = parseInt(mins, 10);
    if (!m) return '0.0';
    return (m / 60).toFixed(1);
  }

  /** F.9 PDF AcroForm values are whole minutes, not hours. */
  formatFormMinutes(mins) {
    const m = parseInt(mins, 10);
    if (!m) return '0';
    return String(m);
  }

  roleTotalMinutes() {
    if (!this.summary) {
      return 0;
    }
    return (this.summary.minPIC || 0) + (this.summary.minCoP || 0) + (this.summary.minDual || 0);
  }

  prevPage() {
    if (this.offset <= 0) return;
    this.offset = Math.max(0, this.offset - this.limit);
    this.search();
  }

  nextPage() {
    if (this.offset + this.limit >= this.total) return;
    this.offset += this.limit;
    this.search();
  }

  pageLabel() {
    if (!this.total) return '0 flights';
    const start = this.offset + 1;
    const end = Math.min(this.offset + this.limit, this.total);
    return start + '–' + end + ' of ' + this.total;
  }
}

angular.module('plistCsvApp')
  .component('logbook', {
    templateUrl: 'app/logbook/logbook.html',
    controller: LogbookController,
    controllerAs: 'lb'
  });

})();
