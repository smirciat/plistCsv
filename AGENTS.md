# Agent guide — plistCSV (Flight Report → logbook CSV)

## What this is

Legacy **Angular Full-Stack** app (generator v3.8): **AngularJS 1.x + Express + Sequelize**. Personal tooling to turn **Flight Report / iPad backup** `FlightIndex.plist` (binary plist) into **CSV** for import into a pilot logbook (e.g. mccPilotLog), with an optional **monthly F12 PDF** path on the main screen.

Sibling reference (read-only unless Andy says otherwise): **`~/fraBering`** — same generator stack, Node 12 install pattern, and future **Firebase Admin** wiring.

## Stack constraints

- Target **Node.js ^12.22.12** and **npm ^6.14.12** (see `docs/node-12-setup.md`). Do not upgrade major dependencies without explicit approval.
- **Babel 6 / ES2015** on the server; **Grunt + Bower** for the client.
- **Sequelize 3** with SQLite (typical local) or PostgreSQL if configured.
- No auth layer in this app (unlike fraBering); API routes are open in dev — treat production exposure carefully.

## Core user flow

1. User sets **start date** and options on `/` (`client/app/main/`).
2. User uploads **FlightIndex.plist**; client POSTs base64 to **`POST /api/workouts/upload`**.
3. Server parses plist via **`bplist-parser`** (`server/api/workout/workout.controller.js`).
4. Client **`MainController.buildFlightInfo()`** builds CSV (night/day splits via **SunCalc** + airport list from **`GET /api/airports`**).
5. User downloads **`result.csv`** (or generates monthly PDF via **`GET /pdf?filename=F12New.pdf`** + pdfform).

Legacy generator cruft (quiz, beech, ifit, ap routes) may remain; **main** is the product surface.

## Project layout

| Path | Purpose |
|------|---------|
| `client/app/main/` | Plist upload, CSV/PDF generation UI |
| `server/api/workout/` | Plist upload + parse endpoint |
| `server/api/logbook/` | Read-only mccPilotLog SQLite (`uploads/database.db`) |
| `client/app/logbook/` | Browse/search imported logbook |
| `server/api/airport/` | Airport coordinates for twilight/night logic |
| `server/pdfs/` | F12 PDF template |
| `server/routes.js` | `/api/workouts`, `/api/airports`, `/pdf` |

## Commands

```bash
grunt serve          # Dev server (livereload + API)
grunt build          # Production build → dist/
npm test             # Grunt test (Karma + Mocha)
npm start            # node server (production; serves built client when configured)
```

Use **Node 12** for install and daily dev (`.nvmrc`).

## Firebase

**`server/firebase.json`** is local credentials only (gitignored). Read helper: `server/components/firebase/index.js`. **`GET /api/flights/by-employee/:employeeId`** loads Firestore `flights` for an employee (default PIC / `pilotEmployeeNumber`). See `docs/firebase-future.md`. No Firestore writes without explicit request and fraBering release docs.

## Protected areas — read `.cursor/rules/` before editing

1. **Secrets** — never commit or paste: `local.env.js`, `development.js` (if local-only), `server/firebase.json`
2. **`server/config/express.js`** — middleware and static paths
3. **Database** — no destructive SQL or `sequelize.sync({ force: true })`
4. **`client/app/main/main.controller.js`** — logbook CSV column semantics and night/day rules; change only with clear intent

## Change discipline

- Match existing AngularJS / Express patterns in the touched module.
- Smallest change that fixes the issue; no stack modernization unless asked.
- **fraBering is read-only** for reference unless Andy authorizes writes there.

## Related docs

- `docs/node-12-setup.md` — install ladder (mirrors fraBering README)
- `docs/firebase-future.md` — Firebase flightIndex + PFR reads
- `docs/logbook-database-plan.md` — mccPilotLog `uploads/database.db` → logbook UI / optional Postgres (`rotdb`)
