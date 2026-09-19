'use strict';

var express = require('express');
var controller = require('./flight.controller');

var router = express.Router();

router.get('/flight-index/:employeeId', controller.flightIndexPlist);
router.get('/by-employee/:employeeId', controller.byEmployee);

module.exports = router;
