'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var workoutCtrlStub = {
  index: 'workoutCtrl.index',
  show: 'workoutCtrl.show',
  create: 'workoutCtrl.create',
  update: 'workoutCtrl.update',
  destroy: 'workoutCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var workoutIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './workout.controller': workoutCtrlStub
});

describe('Workout API Router:', function() {

  it('should return an express router instance', function() {
    expect(workoutIndex).to.equal(routerStub);
  });

  describe('GET /api/workouts', function() {

    it('should route to workout.controller.index', function() {
      expect(routerStub.get
        .withArgs('/', 'workoutCtrl.index')
        ).to.have.been.calledOnce;
    });

  });

  describe('GET /api/workouts/:id', function() {

    it('should route to workout.controller.show', function() {
      expect(routerStub.get
        .withArgs('/:id', 'workoutCtrl.show')
        ).to.have.been.calledOnce;
    });

  });

  describe('POST /api/workouts', function() {

    it('should route to workout.controller.create', function() {
      expect(routerStub.post
        .withArgs('/', 'workoutCtrl.create')
        ).to.have.been.calledOnce;
    });

  });

  describe('PUT /api/workouts/:id', function() {

    it('should route to workout.controller.update', function() {
      expect(routerStub.put
        .withArgs('/:id', 'workoutCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('PATCH /api/workouts/:id', function() {

    it('should route to workout.controller.update', function() {
      expect(routerStub.patch
        .withArgs('/:id', 'workoutCtrl.update')
        ).to.have.been.calledOnce;
    });

  });

  describe('DELETE /api/workouts/:id', function() {

    it('should route to workout.controller.destroy', function() {
      expect(routerStub.delete
        .withArgs('/:id', 'workoutCtrl.destroy')
        ).to.have.been.calledOnce;
    });

  });

});
