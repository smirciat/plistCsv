'use strict';

const {
  buildLogbookRecordFromPlistRow,
  DEFAULT_PLANE_MAP
} = require('./flightIndexToLogbook');

describe('flightIndexToLogbook', function() {

  it('skips rows when PFR does not match employee', function() {
    const row = {
      date: '2025-06-15T12:00:00.000Z',
      acftNumber: 'N404BA',
      flightTime: 120,
      flightNumber: '850',
      pfrNumber: '1234567',
      route: ['GAM', 'SVA'],
      legTimesArray: []
    };
    const record = buildLogbookRecordFromPlistRow(row, {
      airports: [],
      empNum: '933',
      planeMap: DEFAULT_PLANE_MAP
    });
    expect(record).to.equal(null);
  });

  it('sets block, XC, IFR, and capped night minutes like addCsvLine', function() {
    const airports = [{
      threeLetter: 'GAM',
      latitude: '63.766667',
      longitude: '-171.733333'
    }, {
      threeLetter: 'SVA',
      latitude: '63.686667',
      longitude: '-170.493333'
    }];
    const row = {
      date: '2025-01-15T12:00:00.000Z',
      acftNumber: 'N404BA',
      flightTime: 130,
      flightNumber: '850',
      pfrNumber: '9331234',
      route: ['GAM', 'SVA'],
      legTimesArray: [{
        off: '2025-01-15T22:00:00.000Z',
        on: '2025-01-15T23:30:00.000Z',
        inFlight: true
      }]
    };
    const record = buildLogbookRecordFromPlistRow(row, {
      airports,
      empNum: '933',
      planeMap: DEFAULT_PLANE_MAP
    });
    expect(record).to.be.ok;
    expect(record.minTotal).to.equal(130);
    expect(record.minPIC).to.equal(130);
    expect(record.minXC).to.equal(130);
    expect(record.minIFR).to.equal(130);
    expect(record.minNight).to.be.at.least(0);
    expect(record.minNight).to.be.at.most(130);
    expect(record.TODay + record.TONight).to.be.at.least(1);
  });

});
