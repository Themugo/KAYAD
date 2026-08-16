---
title: TESTING
owner: @qa-lead
team: qa
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [testing]
---
# Running the backend tests

The backend test suite uses **Jest + Supertest** against a MongoDB database.

## Requirements

- **Node 20** (see `../.nvmrc`). This is what CI uses.
  On Node 22+ the bundled `mongodb-memory-server` binary fails to start
  (`spawn EFTYPE` / `Instance failed to start`), which makes every
  DB-dependent test fail. Use Node 20:

  ```bash
  nvm install 20 && nvm use 20
  ```

## Run

```bash
cd backend
npm install
npm test
```

On Node 20 this auto-starts an in-memory MongoDB — no external DB needed.

## If you can't use Node 20 (or the in-memory binary won't run)

Point the suite at a real database instead. With `MONGO_URI` set, the
in-memory binary is never used:

```bash
# Windows (cmd)
set MONGO_URI=mongodb://127.0.0.1:27017/kayad-test
npm test

# macOS/Linux, or a free MongoDB Atlas cluster
export MONGO_URI=mongodb+srv://<your-atlas-uri>/kayad-test
npm test
```

## Notes

- CI provides its own `MONGO_URI` (a real `mongo:7` service), so CI never
  depends on the bundled binary or your local Node version.
- If no database is reachable, the suite prints a clear banner and the
  DB-dependent tests fail fast (they don't hang).
