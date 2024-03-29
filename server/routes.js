/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';

export default function(app) {
  // Insert routes below
  app.use('/api/airports', require('./api/airport'));
  app.use('/api/workouts', require('./api/workout'));
  app.get('/pdf', function(req, res){
    if (req.query) res.sendFile("./pdfs/" + req.query.filename, {root: __dirname});
    else res.status(500);
  });
  //app.use('/api/things', require('./api/thing'));
  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
    });
}
