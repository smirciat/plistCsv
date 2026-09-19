# Firebase (planned)

plistCSV uses **Firebase Admin** for read-only flight log queries (same `brg-flight-report` project as fraBering). Use **fraBering** as the reference for additional patterns; do **not** modify fraBering unless asked.

## Local credentials

- Place service account JSON at **`server/firebase.json`** (already in `.gitignore`).
- Never commit, paste in chat, or add to tracked samples.

## fraBering patterns to mirror (read-only)

| Concern | fraBering location |
|--------|---------------------|
| Admin SDK init | `require('firebase-admin')` + `require('../../firebase.json')` in API controllers |
| Firestore access | `admin.firestore()` helpers in `server/api/airplane/airplane.controller.js` (and related) |
| HTTP surface | Routes registered in `server/routes.js` behind auth in fraBering — plistCSV may stay simpler |
| Ops lessons | `~/fraBering/docs/flight-release-firebase.md`, `.cursor/rules/flight-release-firebase.mdc` |

## Implemented

| Piece | Location |
|-------|----------|
| Admin init | `server/components/firebase/index.js` |
| HTTP API | `GET /api/flights/by-employee/:employeeId` (PFR `flights` collection) |
| Logbook CSV source | `GET /api/flights/flight-index/:employeeId?start=&end=` → plist-shaped rows from `pilots/{emp}/flightIndex` (+ `flightIndexBeta`) |

Query matches fraBering `firebaseQuery` defaults: collection **`flights`**, field **`pilotEmployeeNumber`**, `orderBy('date','desc')`. Tries string and numeric employee id. Optional query params:

- `limit` — default 500, max 8000
- `seat=any` — also match **`coPilotEmployeeNumber`** (merged, sorted by date desc)

Example: `GET /api/flights/by-employee/933?limit=100`

## Later

- Wire the main UI to this route instead of (or in addition to) plist upload
- Writes / release payloads: follow `~/fraBering/docs/flight-release-firebase.md` strictly
