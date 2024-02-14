'use strict';

angular.module('plistCsvApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('ap', {
        url: '/ap',
        template: '<ap></ap>'
      });
  });
