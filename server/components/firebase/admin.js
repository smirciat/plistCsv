'use strict';

const admin = require('firebase-admin');
const path = require('path');

let firestoreDb;

function getFirestore() {
  if (firestoreDb) {
    return firestoreDb;
  }
  if (!admin.apps.length) {
    const serviceAccount = require(path.join(__dirname, '../../firebase.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  firestoreDb = admin.firestore();
  return firestoreDb;
}

module.exports = {
  admin,
  getFirestore
};
