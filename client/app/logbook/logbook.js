'use strict';

angular.module('plistCsvApp')
  .config(function($stateProvider) {
    $stateProvider.state('logbook', {
      url: '/logbook',
      template: '<logbook></logbook>'
    });
  });
