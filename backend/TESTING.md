---
title: TESTING
owner: @qa-lead
team: qa
last-reviewed: 2026-08-08
review-frequency: monthly
status: active
tags: [testing]
---
# Running the backend tests

The backend test suite uses **Jest**, and does not require a database
connection at all - it exercises pure utility functions and validation
logic (see `tests/utils/` and `tests/validation/`), not live database
calls. There is nothing to install, start, or configure before running
it.

## Requirements

- **Node 22** (see `../.nvmrc`) - this is what CI uses.

## Run

```bash
cd backend
npm install
npm test
```

That's it. No environment variables, no database, no external services.

## Notes

- This file previously described a MongoDB-based setup
  (`mongodb-memory-server`, `MONGO_URI`, a Node 20 requirement) - that
  reflected an earlier architecture. The backend has since moved to
  Supabase/Postgres (see `../supabase/migrations/`), and the test
  suite itself never depended on a live database connection - confirmed
  directly: `mongodb-memory-server` isn't in `package.json`, and every
  file under `tests/` is a self-contained unit test.
- If you're looking for a way to test against real data, that's a
  different concern from this suite - point the app at a real Supabase
  project via `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` in `.env` and use
  the app directly (`npm run dev`), rather than through `npm test`.
