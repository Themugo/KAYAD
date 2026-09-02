---
title: TESTING
owner: @qa-lead
team: qa
last-reviewed: 2026-09-02
review-frequency: monthly
status: active
tags: [testing]
---
# Running the backend tests

The backend test suite uses **Jest + Supertest**. The production data layer is **Supabase/PostgreSQL**; there is no MongoDB test service or MongoDB runtime dependency.

## Requirements

- **Node 22.22.2**, matching `../.nvmrc` and CI.
- Frontend and backend dependencies installed from the committed lockfiles.

## Run

```bash
cd backend
npm ci
npm test
```

The repository's tests should not require a local MongoDB server. Tests that require live Supabase data must use an explicitly configured test project/credentials and must never target production data.

## Environment

Start from `backend/.env.test.example` and provide test-only values where a test requires the real Supabase data layer:

```bash
SUPABASE_URL=https://<test-project>.supabase.co
SUPABASE_SERVICE_KEY=<test-service-role-key>
```

Never commit credentials and never point automated tests at the production database.

## CI

GitHub Actions uses Node 22.22.2 and `npm ci`. The CI pipeline must not provision or expect MongoDB.
