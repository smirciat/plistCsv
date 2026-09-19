'use strict';

describe('Component: BeechComponent', function () {

  // load the controller's module
  beforeEach(module('plistCsvApp'));

  var BeechComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    BeechComponent = $componentController('beech', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
