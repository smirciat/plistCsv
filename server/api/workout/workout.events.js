/**
 * Workout model events
 */

'use strict';

import {EventEmitter} from 'events';
var Workout = require('../../sqldb').Workout;
var WorkoutEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
WorkoutEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Workout.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    WorkoutEvents.emit(event + ':' + doc._id, doc);
    WorkoutEvents.emit(event, doc);
    done(null);
  }
}

export default WorkoutEvents;
