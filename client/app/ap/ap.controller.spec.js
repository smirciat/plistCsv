'use strict';

describe('Component: ApComponent', function () {

  // load the controller's module
  beforeEach(module('plistCsvApp'));

  var ApComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    ApComponent = $componentController('ap', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
