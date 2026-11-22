# 08 — Cloudinary Integration Report

**Status: BLOCKED — no real Cloudinary test performed. No provider success is claimed.**

Checked 2026-11-22: no `CLOUDINARY_*` variables in the session (0 found, names only checked); `api.cloudinary.com` unreachable from the sandbox (connection refused by the network allowlist).

## What exists locally (NOT a provider test)
A loopback Cloudinary-compatible stub runs inside `ci/db-journeys/run.sh`. It exercises our request/response handling, ordering, ownership and cleanup logic. It does not prove signatures, transformations, quotas, CDN delivery or eventual consistency. Listing-creation journeys (incl. new journey 15) run with the stub; in journey 15 uploads are not performed post-response (Cloudinary upload after response: BLOCKED).

## Environment checklist
| Variable | Purpose | Set? |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | **test** cloud only | No |
| `CLOUDINARY_API_KEY` | API key | No |
| `CLOUDINARY_API_SECRET` | API secret (never log) | No |
| Upload preset (if code requires) | unsigned flows | Not verified |
| Network egress to `api.cloudinary.com`, `res.cloudinary.com` | | Blocked |

## Reproducible commands (once unblocked; cmd.exe, repo `C:\Users\hp\Desktop\KAYARD-KE`)
```
set CLOUDINARY_CLOUD_NAME=<test-cloud>
set CLOUDINARY_API_KEY=<key>
set CLOUDINARY_API_SECRET=<secret>
cd backend
npm run dev
```
Then upload via the real UI/API and run each row below; disable the stub (`ci/db-journeys/run.sh` without the stub env) for journey runs.

## Test-data matrix
| # | Case | Expected | Result |
|---|---|---|---|
| 1 | Create dealer listing with 3 JPEGs | listing + 3 delivered URLs fetch 200 | NOT TESTED |
| 2 | Create personal listing with photos | same | NOT TESTED |
| 3 | Replace photo | old asset destroyed, new URL served | NOT TESTED |
| 4 | Reorder / set cover | order persisted | NOT TESTED |
| 5 | Remove photo | asset destroyed | NOT TESTED |
| 6 | Wrong owner modifies photos | 403, no change | stub VERIFIED; real NOT TESTED |
| 7 | Oversize / wrong type | rejected, no orphan | NOT TESTED |
| 8 | Provider failure mid-upload | no half-state, retryable | NOT TESTED |
| 9 | Idempotent replay with files | no duplicate assets (discarded) | stub/unit only |
| 10 | Quota/rate-limit error | graceful message | NOT TESTED |

## Implementation gaps noted
- Orphaned Cloudinary assets from replayed submissions are discarded locally before upload (server temp files only); assets already uploaded post-response by the winning request are not duplicated. Real-provider confirmation pending.
- No automated delivered-URL fetch check exists yet (to add once credentials exist).
