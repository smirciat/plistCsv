/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/airports              ->  index
 * POST    /api/airports              ->  create
 * GET     /api/airports/:id          ->  show
 * PUT     /api/airports/:id          ->  update
 * DELETE  /api/airports/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Airport} from '../../sqldb';

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

// Gets a list of Airports
export function index(req, res) {
  return Airport.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Airport from the DB
export function show(req, res) {
  return Airport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Airport in the DB
export function create(req, res) {
  return Airport.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Airport in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Airport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Airport from the DB
export function destroy(req, res) {
  return Airport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
