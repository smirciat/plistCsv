'use strict';

var app = require('../..');
import request from 'supertest';

var newWorkout;

describe('Workout API:', function() {

  describe('GET /api/workouts', function() {
    var workouts;

    beforeEach(function(done) {
      request(app)
        .get('/api/workouts')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          workouts = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(workouts).to.be.instanceOf(Array);
    });

  });

  describe('POST /api/workouts', function() {
    beforeEach(function(done) {
      request(app)
        .post('/api/workouts')
        .send({
          name: 'New Workout',
          info: 'This is the brand new workout!!!'
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          newWorkout = res.body;
          done();
        });
    });

    it('should respond with the newly created workout', function() {
      expect(newWorkout.name).to.equal('New Workout');
      expect(newWorkout.info).to.equal('This is the brand new workout!!!');
    });

  });

  describe('GET /api/workouts/:id', function() {
    var workout;

    beforeEach(function(done) {
      request(app)
        .get('/api/workouts/' + newWorkout._id)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          workout = res.body;
          done();
        });
    });

    afterEach(function() {
      workout = {};
    });

    it('should respond with the requested workout', function() {
      expect(workout.name).to.equal('New Workout');
      expect(workout.info).to.equal('This is the brand new workout!!!');
    });

  });

  describe('PUT /api/workouts/:id', function() {
    var updatedWorkout;

    beforeEach(function(done) {
      request(app)
        .put('/api/workouts/' + newWorkout._id)
        .send({
          name: 'Updated Workout',
          info: 'This is the updated workout!!!'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          updatedWorkout = res.body;
          done();
        });
    });

    afterEach(function() {
      updatedWorkout = {};
    });

    it('should respond with the updated workout', function() {
      expect(updatedWorkout.name).to.equal('Updated Workout');
      expect(updatedWorkout.info).to.equal('This is the updated workout!!!');
    });

  });

  describe('DELETE /api/workouts/:id', function() {

    it('should respond with 204 on successful removal', function(done) {
      request(app)
        .delete('/api/workouts/' + newWorkout._id)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('should respond with 404 when workout does not exist', function(done) {
      request(app)
        .delete('/api/workouts/' + newWorkout._id)
        .expect(404)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
        });
    });

  });

});
