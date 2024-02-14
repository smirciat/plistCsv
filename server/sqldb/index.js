/**
 * Sequelize initialization module
 */

'use strict';

import path from 'path';
import config from '../config/environment';
import Sequelize from 'sequelize';

var db = {
  Sequelize,
  sequelize: new Sequelize(config.sequelize.uri, config.sequelize.options)
};

// Insert models below
db.Airport = db.sequelize.import('../api/airport/airport.model');
db.Workout = db.sequelize.import('../api/workout/workout.model');
//db.Thing = db.sequelize.import('../api/thing/thing.model');

module.exports = db;
