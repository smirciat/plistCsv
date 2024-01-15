/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/workouts              ->  index
 * POST    /api/workouts              ->  create
 * GET     /api/workouts/:id          ->  show
 * PUT     /api/workouts/:id          ->  update
 * DELETE  /api/workouts/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Workout} from '../../sqldb';
import bplist from 'bplist-parser';

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function saveUpdates(updates) {
  return function(entity) {
    if(entity) {
      return entity.updateAttributes(updates)
        .then(updated => {
          return updated;
        });
    }
  };
}

function removeEntity(res) {
  return function(entity) {
    if (entity) {
      return entity.destroy()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Workouts
export function index(req, res) {
  return Workout.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a list of Workouts
export function some(req, res) {
  return Workout.findAll({attributes:['_id','name','date','maxSpeed','miles','time','avgHR','maxHR','avgSpeed']})
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Workout from the DB
export function show(req, res) {
  return Workout.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Workout in the DB
export function create(req, res) {
  return Workout.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

export async function upload(req,res){
  var file=new Buffer.from(req.body.data,"base64");
  var obj = await bplist.parseFile(file);
  var jsonData=JSON.stringify(obj);
  res.status(200).json(jsonData);//(end();
}

// Updates an existing Workout in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Workout.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Workout from the DB
export function destroy(req, res) {
  return Workout.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
