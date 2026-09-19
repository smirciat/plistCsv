'use strict';

var express = require('express');
var controller = require('./logbook.controller');

var router = express.Router();

router.get('/status', controller.status);
router.get('/annual-resume', controller.annualResume);
router.get('/summary', controller.summary);
router.get('/flights', controller.index);
router.get('/flights/:flightCode', controller.show);
router.post('/sync-firebase', controller.syncFirebase);
router.post('/backup-postgres', controller.backupPostgres);

module.exports = router;
