# 10 - Cloudinary integration tests

**Status: BLOCKED against real Cloudinary** (no `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in this session; checked by name only, values never printed).

## What was verified without credentials (labelled honestly)
The DB-journey harness starts a loopback Cloudinary-compatible stub (`cloudinary-stub.log`) so the REAL upload/destroy application code runs. **The stub is not Cloudinary**: it proves our code's request/response handling, ordering, rollback and ownership rules, not Cloudinary's behaviour (signatures, transformations, quotas, CDN, eventual consistency). Journeys 07, 09, 11, 12 and 13 (personal and dealer listing creation, photos, publish/pause) pass in the full harness with the stub running: VERIFIED against the stub only; which of them exercise each photo operation was not itemised. 

## Workflow matrix
| Workflow | Stub | Real Cloudinary |
|---|---|---|
| Upload on create (personal, dealer) | VERIFIED | BLOCKED |
| Replace / reorder / set cover | Covered by existing unit tests and journeys (not individually re-inspected this phase) | BLOCKED |
| Remove photo, destroy asset | VERIFIED | BLOCKED |
| Failure mid-upload: no orphan listing, no half state | Existing tests (`cleanupUploadsOnError`), not re-inspected this phase | BLOCKED |
| Wrong owner cannot change photos (403) | VERIFIED | n/a (our code) |
| Large file / wrong type rejection | Existing unit tests, not re-inspected this phase | BLOCKED |
| Signed delivery, transformations, quota errors | NOT TESTED | BLOCKED |

## Needed to unblock
A Cloudinary account **test/sandbox cloud** with the three variables above exported for the session (never the production cloud), plus an upload preset if the code expects one. Then run the same journeys with the stub disabled and add a delivered-URL fetch check.
