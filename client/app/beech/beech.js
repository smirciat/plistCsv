'use strict';

angular.module('plistCsvApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('beech', {
        url: '/beech',
        template: '<beech></beech>'
      });
  });
