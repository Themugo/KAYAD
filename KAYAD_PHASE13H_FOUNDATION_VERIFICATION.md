# KAYAD Phase 13H — Foundation Verification

| check | result |
|---|---|
| Foundation archive | `/home/claude/g/out/KAYAD-PHASE13G-STAGING-READINESS-20261026.zip` (184,880,252 bytes) |
| SHA-256 from sidecar | `fc60e581d9ee758fa48c46fce590c88d8c18f9b16a53de8c4c4e17357c77e8a1` |
| SHA-256 recalculated | identical; `sha256sum -c` → OK |
| `unzip -t` | "No errors detected in compressed data" |
| Extraction | new isolated directory `/home/claude/h/KAYAD-PHASE13H-WORK`; the 13G tree and ZIP were not modified |
| Source manifest (`KAYAD_PHASE13G_PACKAGE_MANIFEST.txt`) | 8,292 files, 0 mismatches (no documented exceptions needed) |
| Runtime requirements (from project files) | Node ≥ 22.22.2 (`package.json` and `backend/package.json` engines; `.nvmrc`); environment: Node v22.23.4, npm 10.9.9 |
| Dependency install | `npm ci` frontend (470 packages, exit 0) and backend (812 packages, exit 0): `validation-logs/phase13h/npm-ci-*.log` |
| Baseline reproduction | Route sweep on a freshly migrated database reproduced the 13G "after" result exactly (480 routes: 200×342, 400×14, 403×6, 404×2, 405×1, 408×2, 500×110, 503×3). 13G suite counts were NOT reused: every figure in this phase is from a fresh 13H run |
| Historical evidence | 13G logs remain in `validation-logs/phase13g/` untouched; 13H results are in `validation-logs/phase13h/` |

Correction to a 13G statement: the 13G report said the 5xx count fell "113 → 110". The sweep status table is `500: 110, 503: 3`, i.e. **113 total 5xx** after the 13G fixes (116 before). "110" counted only HTTP 500. Phase 13H starts from 113.

Also found while reading the 13G material: Phase C1 recorded that **no KAYAD staging project existed on 2026-10-21** and that production's migration history lacks 66 repository migrations. Both are unverified today and shape the preflight (see runbook).
