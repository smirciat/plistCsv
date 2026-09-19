# Node 12 setup (plistCSV)

Same ladder as **fraBering** (`~/fraBering/README.md`): this repo was generated on older Node and needs a stepped install before day-to-day use on **12.22.12**.

## Prerequisites

- `nvm` or similar to switch Node versions
- Global: `grunt-cli`, `bower`
- SQLite (default dev DB) unless PostgreSQL is configured

## Install steps

1. `cd ~/plistCSV` and `nvm use` (reads `.nvmrc`).
2. Ensure `package-lock.json` is present.
3. **First-time legacy install** (only if a fresh `npm install` fails on Node 12):
   - Temporarily remove the `preinstall` script (`npx npm-force-resolutions`) from `package.json`.
   - On **Node 4**, run `npm install` once (may need Python 2.7 for native modules).
   - On **Node 6**, run `npm install` again.
   - Restore `preinstall`, switch to **Node 12**, run `npm install`.
4. `bower install` in the project root.
5. Copy `server/config/local.env.sample.js` → `server/config/local.env.js` if missing.
6. `grunt serve` — app at `/`, API under `/api/*`.

## package.json notes (Node 12)

- `engines`: Node ^12.22.12, npm ^6.14.12
- `resolutions.graceful-fs`: avoids older Grunt dependency breakage
- `preinstall`: `npx npm-force-resolutions`
- Grunt uses `@sailshq/grunt-contrib-uglify` and `grunt-ng-annotate-patched` (see `Gruntfile.js`)

## Verify

```bash
nvm use
npm install
bower install
grunt serve
```

Upload a sample `FlightIndex.plist` on the home page and confirm CSV download.
