# KAYAD Runtime Certification Foundational Base 4

Date: 2026-09-26

## Scope
Runtime/certification hardening only. No product features, business rules, UI behavior, or data model changes.

## Root cause addressed
The isolated local runtime validator was still timing out on `GET /api/cars` after dependency installation, lint, production build, and the full 46-file / 308-test suite passed. The public cars route had database availability protection inside the controller, but optional cache/search middleware executed before the controller. That allowed a degraded-mode request to enter infrastructure-dependent middleware before the controller could return its controlled 503 response.

## Correction
Added a database availability guard at the start of `GET /api/cars`. When Supabase is not configured, the route now returns the existing `DATABASE_UNAVAILABLE` 503 contract immediately. When Supabase is configured, the guard is transparent and the existing validation, caching, latency tracking, search tracking, and controller path remain unchanged.

## End-to-end safety requirement
The Windows certification gate must be rerun from install through lint, build, all tests, local runtime, canonical architecture, release, dependency security, and deployment readiness before committing this foundation.

## Known test-environment limitation
The assistant container cannot perform the authoritative dependency-backed certification because its Node runtime is 22.16.0 while the repository requires Node >=22.22.2. Windows Node 22.22.2 remains the authoritative environment.
