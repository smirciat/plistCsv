/**
 * Airport model events
 */

'use strict';

import {EventEmitter} from 'events';
var Airport = require('../../sqldb').Airport;
var AirportEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
AirportEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Airport.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    AirportEvents.emit(event + ':' + doc._id, doc);
    AirportEvents.emit(event, doc);
    done(null);
  }
}

export default AirportEvents;
