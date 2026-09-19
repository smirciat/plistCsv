'use strict';

angular.module('plistCsvApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('quiz', {
        url: '/quiz',
        template: '<quiz></quiz>'
      });
  });
