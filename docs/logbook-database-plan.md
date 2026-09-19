# Logbook database plan (mccPilotLog → plistCSV)

## What you have

| Item | Detail |
|------|--------|
| File | `uploads/database.db` (gitignored with `uploads/`) |
| Format | **SQLite 3** (~6.8 MB) |
| App | **mccPilotLog** desktop/mobile logbook schema |
| Core table | **`Flight`** — **21,130** rows (1987 → 2026-09-17) |
| Related | `Aircraft`, `Airfield` / `Airfield40`, `Pilot`, `Limits`, sync tables |

Your existing **CSV export** in `main.controller.js` is already shaped for mccPilotLog import (`TODay`, `LdgDay`, `minTotal`, `DepCode`, `UserN2`, etc.). The `.db` file is the **same product’s native store**, not the generator’s `dev.sqlite` (Question / Workout / Airport seed data).

## Goal

A **simple logbook UI** in plistCSV: browse/search flights, totals, eventually compare or merge with **Firebase flightIndex** / CSV pipeline — without re-exporting plist from Flight Report.

## Recommendation (phased)

### Phase 1 — Read-only logbook from SQLite (do this first)

**Do not** point the app’s primary Sequelize DB at `database.db`. Generator models (`Question`, `Workout`, `Airport`) do not match mccPilotLog tables and would fight migrations/sync.

Instead:

1. **Second data access path** — dedicated module, e.g. `server/components/logbook/sqlite.js`:
   - Path from env: `LOGBOOK_SQLITE_PATH` (default `uploads/database.db`)
   - Use **`sqlite3`** (already a dependency) or a **second Sequelize instance** with `dialect: 'sqlite', storage: <path>, logging: false` and **no** `sync()` / no generator models.
2. **Read API** (no writes yet), e.g.:
   - `GET /api/logbook/flights?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=&offset=`
   - `GET /api/logbook/flights/:flightCode`
   - `GET /api/logbook/summary?year=2026` (optional: PIC minutes, landings)
3. **Queries**: `Flight` joined to `Aircraft` (`Fin` = tail), resolve airports where possible. Note: many rows use **negative `DepCode`/`ArrCode`** (synthetic mccPilotLog codes, same idea as `-21188` in CSV); route text often lives in **`Remarks`** (e.g. `-SVA-GAM`).
4. **Client**: new ui-router state `logbook` — table (date, flight #, minTotal, tail, remarks), reuse `angularMoment` for dates.

**Effort**: small; **risk**: low; **no** change to Firebase or plist flow.

### Phase 2 — Optional one-time import to PostgreSQL (`rotdb`)

Use when you want **one server backup**, sharing with other tools, or writes from multiple apps.

1. Define a **`logbook` schema** on Postgres (not mixed into fraBering’s ops tables):
   - `logbook.flights` — mirror mccPilotLog `Flight` columns you care about (+ `source_flight_code` unique)
   - `logbook.aircraft`, `logbook.airfields` — subset as needed
2. **ETL script** (Node or `sqlite3` + `pg`): read `uploads/database.db` → bulk insert into Postgres.
3. Connection: same pattern as fraBering `SEQUELIZE_URI` in `local.env.js` — you mentioned **rotdb**; wire `LOGBOOK_DATABASE_URL` or reuse URI with `search_path=logbook`.
4. plistCSV logbook API reads from Postgres instead of SQLite when `LOGBOOK_DATABASE_URL` is set.

**When to choose Postgres**: HA/backup, SQL reporting across apps, or appending imports from Firebase on the server. **When to stay on SQLite**: single-user, file tracks mccPilotLog backup, read-mostly.

### Phase 3 — Write path (later)

- **Import CSV** generated on main page → insert into mccPilotLog-shaped rows (duplicate detection by date + flight number + minutes).
- **Import Firebase flightIndex** → same mapper you have for plist → insert or “staging” table before commit.
- **Sync back to mccPilotLog**: export CSV for manual import, or write SQLite only if you accept plistCSV as source of truth (higher risk).

Keep writes **behind** explicit UI + idempotency keys; never `sequelize.sync({ force: true })` on production data.

## Sequelize vs raw SQLite

| Approach | Pros | Cons |
|----------|------|------|
| **Raw `sqlite3`** for logbook only | Simple, no model drift, read-only is trivial | Manual SQL |
| **Second Sequelize instance** | Familiar if you add models later | mccPilotLog has 50+ columns; full model is heavy |
| **Replace `dev.sqlite` URI** | One pool | Breaks generator DB; wrong schema |

**Suggested**: raw SQL or thin Sequelize models for `Flight` only (columns you display in v1).

## Alignment with existing features

```text
Flight Report plist / Firebase flightIndex
        → main.controller buildFlightInfo() → CSV (mccPilotLog import format)
        → [future] POST /api/logbook/import/csv

mccPilotLog database.db
        → GET /api/logbook/flights → logbook UI
        → [optional] Postgres rotdb mirror
```

Airport list in plistCSV (`/api/airports`) is **Bering ops** data for SunCalc/night; mccPilotLog **Airfield** is separate. Logbook UI can show Remarks/route first; enrich with Airfield when `DepCode`/`ArrCode` match.

## Config to add (when implementing)

In `server/config/local.env.sample.js` (values only in local `local.env.js`):

```javascript
LOGBOOK_SQLITE_PATH: 'uploads/database.db',
// LOGBOOK_DATABASE_URL: 'postgres://user:pass@host:5432/rotdb?schema=logbook',
```

## Security

- `uploads/database.db` is personal logbook data — keep **gitignored**; do not commit.
- Logbook API: no auth today on plistCSV; if exposed via nginx, treat like other personal tools (VPN, firewall, or add auth later).

## Slice 1 (implemented)

| Piece | Location |
|-------|----------|
| Read-only SQLite | `server/components/logbook/sqlite.js` — uses **system `sqlite3 -json`** (not `node-sqlite3`) → `LOGBOOK_SQLITE_PATH` |
| API | `GET /api/logbook/status`, `/flights?from&to&q&limit&offset`, `/summary`, `/flights/:flightCode` |
| UI | `/logbook` — date range, search, totals, **F.9 annual resume** block (PDF minutes), paginated table |
| API | `GET /api/logbook/annual-resume?from&to&flightTimeOnly=1` — same totals as summary `annualResume` |

**rotdb** (`SEQUELIZE_URI` → `…/rotdb`) stays the generator Sequelize DB (Airports, Workouts, etc.). mccPilotLog tables are **not** imported yet.

## Data strategy (Andy, 2026)

- **Future flights**: Firebase (Flight Report) — add/edit at source.
- **Past flights**: one-time import into Postgres on **rotdb** later; no ongoing sync required.
- **Slice 1**: browse/query the SQLite backup as-is until ETL lands.

## Slice 2 (implemented)

1. **Schema**: `server/components/logbook/schema.sql` → `logbook.aircraft`, `logbook.flights` on **rotdb** (separate from generator tables).
2. **ETL**: `node server/scripts/logbook-import-sqlite-to-postgres.js` (uses `LOGBOOK_DATABASE_URL` or falls back to `SEQUELIZE_URI` from `local.env.js`). Optional `--truncate` before full reload.
3. **Runtime**: `server/components/logbook/index.js` uses **Postgres** when `LOGBOOK_DATABASE_URL` is set, else SQLite CLI.
4. Firebase forward sync writes to whichever backend is active.
