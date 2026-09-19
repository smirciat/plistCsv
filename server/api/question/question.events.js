/**
 * Question model events
 */

'use strict';

import {EventEmitter} from 'events';
var Question = require('../../sqldb').Question;
var QuestionEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
QuestionEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Question.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    QuestionEvents.emit(event + ':' + doc._id, doc);
    QuestionEvents.emit(event, doc);
    done(null);
  }
}

export default QuestionEvents;
