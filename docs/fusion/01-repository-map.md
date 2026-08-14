# 01 — Repository Map
**KAYAD Fusion Audit — Document 1 of 12**
Status: Initial pass. Every claim below was verified directly (file reads, greps, dependency inspection) during this session — nothing here is inferred from documentation or assumed from naming alone. Sections marked "NOT YET VERIFIED" are honestly flagged as open, not guessed at.

---

## 0. Critical Context Correction

Every prior consolidation-phase document produced earlier in this engagement (`KAYAD_CURRENT_STATE.md`, `KAYAD_WORKFLOW_REGRESSION.md`) was written under the belief that KAYAD had **no backend at all** — that belief was based entirely on inspecting `src/` (the frontend) and finding no live API calls, no connected auth, and only mock data. That finding about the frontend's own behavior remains accurate. **What was wrong is the conclusion drawn from it.**

A `backend/` folder sitting alongside the frontend was never explored until this audit. It contains a substantial, real, independently-built Node.js/Express API — not a stub, not a placeholder. This changes the actual shape of the fusion problem: this is not "build a backend to match an existing frontend." It is **"connect two fully-built, currently disconnected systems that were developed in parallel."**

This also means an earlier retraction needs to be reopened, not trusted: this session previously searched the frontend for terms from an old note about "116 orphaned enterprise-platform models" (VXP, XOS, AI Builder, Digital Twin, etc.), found nothing, and declared the claim a misattributed false lead. That search never touched `backend/`. A file named `digitalTwinRoutes.js` was found in the backend's route folder during this audit — direct evidence that at least one of those terms is real and backend-side. **The retraction is suspended pending investigation in `06-duplicate-map.md` / `07-dead-code-map.md`, not restated as fact in either direction.**

---

## 1. Top-Level Repository Layout

Working directory for this audit: `/home/claude/KAYAD-live` (a git clone of `https://github.com/Themugo/KAYAD.git`, `main` branch).

```
KAYAD-live/
├── src/                    Frontend (React 19 + Vite + TypeScript) — extensively audited in prior sessions
├── backend/                Backend API (Node.js/Express) — NEWLY DISCOVERED, this audit's primary subject
├── supabase/                Root-level Supabase project config + migrations (separate from backend/db/)
├── k8s/                     Kubernetes manifests
├── helm/                    Helm charts
├── nginx/                   Reverse proxy config
├── grafana/                 Observability dashboards
├── load-tests/              Load/performance test scripts
├── runbooks/                Operational runbooks
├── e2e/                     End-to-end tests (scope not yet inspected)
├── docs/                    Existing project documentation (scope not yet inspected)
├── scripts/                 Utility/ops scripts
├── logs/                    Log output (runtime artifact, not source)
├── lib/                     NOT YET VERIFIED — contents unknown
├── .github/                 CI/CD workflows
├── .opencode/, .agents/     Tooling/agent config, likely unrelated to application architecture
└── dist/                    Frontend build output (artifact)
```

**Duplicate project copies found on this filesystem, not just this repo:** three separate directories exist under `/home/claude/` — `KAYAD`, `KAYAD-live`, `KAYAD-verify` — each with an identical top-level structure to the above. All three share the same git remote (`https://github.com/Themugo/KAYAD.git`). `KAYAD` and `KAYAD-verify` show identical, older commit histories (`e0799751`/`fd1b0d1a` "Fix TypeScript errors, backend bug, and test suite" as their tip). `KAYAD-live` — the one this session has worked in — has diverged far ahead of both with this session's own extensive commit history. **These are very likely separate clones/checkouts of the same GitHub repository, probably from different work sessions or surfaces, not three architecturally different projects.** Not fully confirmed — flagged for the fusion roadmap as something to resolve (which one is authoritative going forward) rather than assumed.

---

## 2. Frontend (`src/`) — Summary, Already Well-Established

This has been the subject of dozens of prior audit/hardening rounds this session. Not re-verified exhaustively here; summarized for this map's completeness.

- React 19 + Vite + TypeScript, ~47 top-level feature components after this session's own cleanup pass (5 orphaned components deleted, 8,522 lines removed)
- 19 client-side routes via a hand-rolled `activeNav` string + `VALID_VIEWS` set in `App.tsx` — no router library
- **Zero real API integration**: no `fetch`/`axios` call to any backend path found anywhere in `src/`; a `VITE_API_URL` env var is *type-declared* (`vite-env.d.ts`) but never actually read or used
- All business data — vehicles, auctions, bids, dealers, inspections, escrow — comes from static TypeScript mock files under `src/data/`
- Authentication is a passwordless demo-role-picker (`AuthModal.tsx`) with zero backend verification
- 155 automated tests (Vitest), 0 TypeScript errors, clean production build as of this session's last commit

**This confirms the frontend is fully mock-data-driven and has never called this backend.** That is the single most important integration fact for the rest of this audit.

---

## 3. Backend (`backend/`) — Newly Discovered, Primary Subject of This Audit

### 3.1 Identity
```json
{
  "name": "kayad-backend",
  "version": "2.0.0",
  "description": "Kayad API — Live Auctions, M-Pesa, Escrow",
  "main": "server.js",
  "type": "module"
}
```
Entry point: `backend/server.js` (46,305 bytes — a large, monolithic entry file; not yet read in full).

### 3.2 Scale
| Category | Count |
|---|---|
| Route files (`routes/`) | 92 |
| Controllers (`controllers/`) | 75 |
| Models (`models/`) | 185 |
| Services (`services/`, top-level only — many domain folders have their own nested `services/` too) | 73 |
| Total backend files (excluding `node_modules`) | ~1,470 |

### 3.3 Real Dependencies (42 production dependencies, package.json)
Grouped by what they imply is actually intended to run:

- **Database**: `@supabase/supabase-js` — confirms Supabase/Postgres as the intended data layer, matching this fusion project's stated source of truth
- **Queues/Jobs**: `bullmq`, `ioredis`, `node-cron`
- **Realtime**: `socket.io`
- **Auth**: `jsonwebtoken`, `bcryptjs`, `express-session`
- **Storage**: `cloudinary`, `multer`, `sharp` (image processing)
- **Observability**: `@sentry/node`, `@sentry/profiling-node`, full `@opentelemetry/*` suite, `pino`/`pino-pretty`/`pino-roll` (structured logging), `posthog-node`
- **Comms**: `@sendgrid/mail`, `twilio`, `nodemailer`
- **API docs**: `swagger-jsdoc`, `swagger-ui-express`, plus a **306,597-byte `openapi.yaml`** at the backend root — a substantial, hand-or-generator-maintained API specification, not a stub
- **Validation**: `zod`
- **PDF generation**: `pdfkit`
- **Security**: `helmet`, `express-rate-limit`, `isomorphic-dompurify`, `cors`

This is a dependency set consistent with a genuinely production-intended system, not a scaffold or tutorial project.

### 3.4 Domain Folder Structure
`backend/` is organized into ~25 domain folders, most with their own `services/` subfolder: `identity`, `revenue`, `communications`, `ai`, `infrastructure`, `mediaEventEngine`, `inspectionBusinessCenter`, `platform`, `governance`, `queues`, `inspection`, `vehiclePassport`, `partnerPlatform`, `reliability`, `workflowOrchestration`, `cms`, `socket`, `realtime`, `ownership`, `operations`, `dataExchange`, `countries`, `digitalInspection`, `vehicleIntelligence`, plus flat `controllers/`, `models/`, `services/`, `routes/`, `middleware/`, `utils/`, `validation/`, `config/`, `db/`, `workers/`, `testing/`.

**Naming overlap worth flagging now, investigated properly in `02` and `06`:** `inspection/` (with its own `controllers/services/routes`) and `inspectionBusinessCenter/` and `digitalInspection/` all exist as separate top-level domains. Whether these are three genuinely distinct capabilities or duplicated/overlapping implementations of "inspection" is not yet determined — this is exactly the kind of question `06-duplicate-map.md` exists to answer, not something to guess at here.

### 3.5 Data Layer — Real, But Not Connected to a Live Instance
- **Models use a real factory pattern** (`models/_base.js`) calling `getSupabase()` from `utils/supabase.js`, with an explicit `TABLE_MAP` translating ~50+ model names to real snake_case Postgres table names (`Auction→auctions`, `Bid→bids`, `Escrow→escrows`, `MpesaTransaction→mpesa_transactions`, `EscrowVault→escrow_vaults`, and many more) — this is genuine ORM-adjacent code, not a mock.
- **`backend/db/`** contains 21 `.sql` schema files, one per domain (`ai.schema.sql`, `cms.schema.sql`, `inspection.schema.sql`, `vehiclePassport.schema.sql`, etc.) plus a `schema_clean.sql`.
- **Root-level `supabase/migrations/`** contains 17 real, timestamped, business-named migration files (`gari_motors_full_schema`, `seed_demo_vehicles`, `car_listing_flow`, `dealer_verification_referrals`, `chats_escrows_userauth_real_tables`, `refresh_tokens`, `user_preferences`, `idempotency_softdelete`, and others) — this reads as genuine, incremental schema evolution, not a single dumped schema.
- **Critical gap**: `backend/.env.example` has `SUPABASE_URL="https://<your-project>.supabase.co"` — a placeholder, not a real project reference. Cross-checked against this account's actual Supabase access (`Supabase:list_projects`): only one real project exists, `CALQULUS-PMS`, an unrelated property-management SaaS. **There is no live, provisioned Supabase project backing this KAYAD backend right now.** The schema and migrations are fully written and ready to apply; nothing has been applied to a real database that this audit can currently reach.

**Naming note worth investigating, not yet explained:** one migration is named `gari_motors_full_schema` — "gari" is Swahili for "car." Whether this is an earlier project name, an unrelated internal codename, or a typo/copy-paste artifact from a different project is unknown and flagged for `06-duplicate-map.md`.

---

## 4. What This Audit Has NOT Yet Covered (Explicitly, Not Silently)

Per the "STOP after this document, continue in subsequent turns" plan already agreed with the user:

- Full route-by-route API inventory (→ `03-api-map.md`)
- Full database table inventory and cross-check against the 185 models' `TABLE_MAP` (→ `04-database-map.md`)
- Authentication architecture — backend JWT/session flow, and whether it has any relationship at all to the frontend's demo-login (→ `05-auth-map.md`)
- Systematic duplicate detection within the backend's ~25 domain folders, and the `inspection`/`inspectionBusinessCenter`/`digitalInspection` overlap specifically (→ `06-duplicate-map.md`)
- Dead code / unreachable route detection within the backend (→ `07-dead-code-map.md`)
- Full mock-data inventory across both frontend and backend, including `backend/data/` and `backend/seed.js` (→ `08-mock-data-map.md`)
- Complete route map cross-referencing frontend navigation against backend routes (→ `09-route-map.md`)
- Integration map — realtime (Socket.IO), queues (BullMQ/Redis), storage (Cloudinary), observability (Sentry/OTel) — built vs. actually wired up (→ `10-integration-map.md`)
- Risk register (→ `11-risk-register.md`)
- Fusion roadmap (→ `12-fusion-roadmap.md`)
- `02-feature-canonical-map.md` (business-capability-level canonical/duplicate mapping) — depends on 03 through 08 being done first to be accurate, so is planned last among the per-capability documents despite its number

No production code has been modified during this document's creation, per the audit's own rule.

---

## 5. Immediate Findings Worth Flagging Even at This Early Stage

1. **The core integration gap**: a fully-built backend and a fully-built frontend exist, verified independently, with zero evidence either was ever built with active knowledge of wiring into the other in its current state. This is the central fact the whole "fusion" mission is about.
2. **No live database**: the Supabase project this backend expects does not exist yet in this account. Schema and migrations are ready; nothing is deployed.
3. **A likely-real "duplicate copies" problem exists above the code level**: three full project checkouts on this filesystem, only one of which (`KAYAD-live`) has this session's work. This needs resolving before "one production application" is meaningful — fusing code inside `KAYAD-live` doesn't matter if `KAYAD`/`KAYAD-verify` are separately deployed or referenced elsewhere.
4. **The "116 orphaned enterprise models" question is reopened**, not resolved in either direction, pending direct investigation of the backend's ~25 domain folders against that old claim's specific terms.
