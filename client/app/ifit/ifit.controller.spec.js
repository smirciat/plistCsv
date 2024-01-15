'use strict';

describe('Component: IfitComponent', function () {

  // load the controller's module
  beforeEach(module('plistCsvApp'));

  var IfitComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    IfitComponent = $componentController('ifit', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
