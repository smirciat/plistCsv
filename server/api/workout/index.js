'use strict';

var express = require('express');
var controller = require('./workout.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/some', controller.some);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/upload', controller.upload);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
