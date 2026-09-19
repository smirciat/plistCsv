'use strict';

const { admin, getFirestore } = require('./admin');

function collectionToArray(snapshotDocs) {
  const array = [];
  snapshotDocs.forEach(doc => {
    const obj = doc.data();
    obj._id = doc.id;
    array.push(obj);
  });
  return array;
}

function compareByDateDesc(a, b) {
  const ad = a && a.date;
  const bd = b && b.date;
  const at = ad && ad._seconds ? ad._seconds : (ad ? new Date(ad).getTime() / 1000 : 0);
  const bt = bd && bd._seconds ? bd._seconds : (bd ? new Date(bd).getTime() / 1000 : 0);
  return bt - at;
}

/**
 * Flights for one employee (PIC), newest first — same field/operator as fraBering firebaseQuery.
 */
async function queryFlightsByPilotEmployeeNumber(employeeId, limit) {
  const db = getFirestore();
  const collectionRef = db.collection('flights');
  const id = String(employeeId);
  let querySnapshot = await collectionRef
    .where('pilotEmployeeNumber', '==', id)
    .orderBy('date', 'desc')
    .limit(limit)
    .get();

  let rows = collectionToArray(querySnapshot.docs);

  if (!rows.length && /^\d+$/.test(id)) {
    querySnapshot = await collectionRef
      .where('pilotEmployeeNumber', '==', parseInt(id, 10))
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    rows = collectionToArray(querySnapshot.docs);
  }

  return rows;
}

/**
 * PIC or SIC rows for employee (fraBering FDR-style OR), merged and sorted by date desc.
 */
async function queryFlightsForEmployee(employeeId, limit) {
  const db = getFirestore();
  const collectionRef = db.collection('flights');
  const id = String(employeeId);
  const idNum = /^\d+$/.test(id) ? parseInt(id, 10) : null;

  async function runQueries(value) {
    const [picSnap, sicSnap] = await Promise.all([
      collectionRef.where('pilotEmployeeNumber', '==', value).orderBy('date', 'desc').limit(limit).get(),
      collectionRef.where('coPilotEmployeeNumber', '==', value).orderBy('date', 'desc').limit(limit).get()
    ]);
    const seen = {};
    const merged = [];
    function pushDoc(doc) {
      if (seen[doc.id]) return;
      seen[doc.id] = true;
      const obj = doc.data();
      obj._id = doc.id;
      merged.push(obj);
    }
    picSnap.docs.forEach(pushDoc);
    sicSnap.docs.forEach(pushDoc);
    merged.sort(compareByDateDesc);
    return merged.slice(0, limit);
  }

  let rows = await runQueries(id);
  if (!rows.length && idNum !== null) {
    rows = await runQueries(idNum);
  }
  return rows;
}

const flightIndexPlist = require('./flightIndexPlist');

module.exports = {
  getFirestore,
  queryFlightsByPilotEmployeeNumber,
  queryFlightsForEmployee,
  fetchFlightIndexPlistRows: flightIndexPlist.fetchFlightIndexPlistRows
};
