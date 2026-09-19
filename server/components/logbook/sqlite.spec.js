'use strict';

const fs = require('fs');
const path = require('path');
const logbook = require('./sqlite');

const dbPath = logbook.resolveDbPath();
const hasDb = fs.existsSync(dbPath);

describe('Logbook SQLite summaries', function() {

  it('maps annual resume PIC to summary minPIC', function(done) {
    if (!hasDb) {
      this.skip();
      return;
    }
    logbook.getSummary({
      from: '2025-01-01',
      to: '2025-12-31',
      flightTimeOnly: '1'
    }).then(summary => {
      expect(summary.minPIC).to.equal(49941);
      done();
    }).catch(done);
  });

  it('lifetime annual resume matches career PIC', function(done) {
    if (!hasDb) {
      this.skip();
      return;
    }
    logbook.getLifetimeAnnualResume({ flightTimeOnly: '1' }).then(resume => {
      expect(resume.scope).to.equal('lifetime');
      expect(resume.form['PIC Hours']).to.equal(1167846);
      expect(resume.form.TOTAL).to.equal(
        resume.form['PIC Hours'] + resume.form['SIC Hours'] + resume.form['Dual received']
      );
      done();
    }).catch(done);
  });

  it('respects past-90-day style windows', function(done) {
    if (!hasDb) {
      this.skip();
      return;
    }
    logbook.getSummary({
      from: '2026-06-20',
      to: '2026-09-17',
      flightTimeOnly: '1'
    }).then(summary => {
      expect(summary.flights).to.equal(93);
      expect(summary.minPIC).to.equal(9883);
      done();
    }).catch(done);
  });

});
