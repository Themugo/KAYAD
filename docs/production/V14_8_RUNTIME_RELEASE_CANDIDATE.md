# KAYAD V14.8 — Runtime Release Candidate

## Scope
V14.8 is the consolidated runtime-release-candidate baseline. It does not introduce a parallel application architecture. It strengthens the existing CI/deployment path so the same source tree is checked before runtime certification and production deployment.

## Included
- Canonical V14 holistic validation remains authoritative.
- Canonical live-certification contract remains authoritative.
- Added `npm run validate:v14:release-candidate` for static release-candidate integrity.
- CI and production deployment now execute the V14 release-candidate gate and runtime preflight on Node 22.22.2.
- Frontend/public secret scanning covers service-role/secret credential names.
- Backend HTTP 501 placeholder scan is part of the release-candidate gate.
- Vercel deployment continues to require a Vercel token and post-deployment verification.
- Existing `npm ci` and `npm run build` deployment contracts are preserved.

## Verification in this environment
- Release-candidate source gate: 17/17 PASS.
- Holistic V14 gate: PASS.
- Live certification contract gate: PASS.
- JavaScript syntax scan: PASS.
- JSON configuration parse: PASS.
- Runtime preflight is intentionally not claimed as green here because this container runs Node 22.16.0 while the project contract is Node >=22.22.2. CI is pinned to Node 22.22.2 and will enforce the runtime preflight there.

## Live certification boundary
No production records were fabricated and no financial/inspection state-changing production calls were performed by this release packaging step. Real authenticated live certification remains the next operational gate after deployment credentials and certification-account credentials are available.
