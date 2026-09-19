'use strict';

describe('Component: QuizComponent', function () {

  // load the controller's module
  beforeEach(module('plistCsvApp'));

  var QuizComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($componentController) {
    QuizComponent = $componentController('quiz', {});
  }));

  it('should ...', function () {
    expect(1).to.equal(1);
  });
});
