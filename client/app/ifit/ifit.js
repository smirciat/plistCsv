'use strict';

angular.module('plistCsvApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('ifit', {
        url: '/ifit',
        template: '<ifit></ifit>'
      });
  });
