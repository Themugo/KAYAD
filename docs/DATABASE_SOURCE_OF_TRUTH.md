# DATABASE_SOURCE_OF_TRUTH.md
**KAYAD — Phase 1**

---

## 0. The Foundational Fact This Phase Confirms

`supabase/migrations/` contains **two historical schema layers that both remain in the migration sequence**, and a later migration explicitly documents which one is real. Quoting directly from `20260710044600_..._chats_escrows_userauth_real_tables.sql.sql`'s own header comment:

> "TABLE_MAP routes Chat -> "chats" and Escrow -> "escrows". The one already-applied migration (`gari_motors_full_schema.sql.sql`) instead created "conversations"+"messages" (normalized) and "escrow_transactions" (a flatter shape than what the app actually uses). **Confirmed directly with the project owner**: `chatController.js`'s and `escrow.service.js`'s designs are the real ones. `conversations`/`messages`/`escrow_transactions` are left exactly as they were (harmless — nothing in the real application code queries them; they exist only so the already-applied migration's own internal FK references resolve)."

This is not this phase's own inference — it's a documented, owner-confirmed fact from earlier work in this same repository, found by reading the migration that superseded the earlier design. It directly answers Phase 1's "gari_motors_full_schema — unexplained naming artifact?" open question from `docs/fusion/01-repository-map.md`: **"Gari Motors" was this project's earlier name** ("Kenya's premium car marketplace" — explicitly stated in that migration's own header), not a typo or unrelated import.

---

## 1. Entity → Model → Table → Migration → Service → API → Frontend Map

### Core Transactional Entities (Verified Real, Actively Used)

| Entity | Model | Table | Defining Migration | Service/Controller | API Route | Frontend |
|---|---|---|---|---|---|---|
| User | `User.js` | `users` | `foundational_tables` | `authController.js` | `/api/v1/auth/*`, `/api/users` | `AuthContext.tsx` (real, connected) |
| Vehicle | `Car.js` | `cars` | `foundational_tables` (+ `car_listing_flow`, `audited_missing_columns` for later columns) | `carController.js` | `/api/cars` | `vehicleApi.ts` (real, built, not wired to UI) |
| Bid | `Bid.js` | `bids` | `foundational_tables` | `bidController.js` | `/api/bids` | Mock only (`mockAuctions.ts`) |
| Chat | `Chat.js` | `chats` | `chats_escrows_userauth_real_tables` (supersedes `gari_motors`'s `conversations`/`messages`) | `chatController.js` | `/api/chat` | Mock only |
| Escrow | `Escrow.js` | `escrows` | `chats_escrows_userauth_real_tables` (supersedes `gari_motors`'s `escrow_transactions`) | `escrow.service.js` | `/api/escrow` | Mock only (`EscrowView.tsx`) |
| Favorite | `Favorite.js` | `favorites` | `foundational_tables` | — | `/api/favorites` | Mock only |
| Car View | — (no model found) | `car_views` | `foundational_tables` | — | — | — |

### Confirmed Duplicate/Superseded Tables (Legacy, Harmless, Owner-Confirmed)

| Legacy table | Created by | Real replacement | Status |
|---|---|---|---|
| `profiles` | `gari_motors_full_schema` | `users` | **LEGACY** — zero real application code queries it (the one apparent reference, in `uploadRoutes.js`, is a Cloudinary folder path string, not a table query — checked directly) |
| `conversations` + `messages` (normalized pair) | `gari_motors_full_schema` | `chats` (denormalized, messages as a JSONB array on the chat row) | **LEGACY** — owner-confirmed harmless, kept only for FK resolution |
| `escrow_transactions` | `gari_motors_full_schema` | `escrows` | **LEGACY** — owner-confirmed harmless, kept only for FK resolution |

**These should NOT be deleted per this phase's own rule** ("do not silently remove functionality... do not migrate data destructively") — they are already correctly documented as intentionally-inert, and removing them risks breaking the FK references the superseding migration itself says depends on their continued existence.

### The 116-Model Gap (Carried Forward, Not Re-Investigated This Phase)

Full detail in `docs/fusion/04-database-map.md` and `phase-02-database.md`. Summary: 116 of 186 models (re-counted this phase — was 185 before the Phase 2 `Role` model addition) expect a table with no matching `CREATE TABLE` anywhere. Concentrated in the "enterprise platform" cluster (VXP, XOS, AI, Governance, Automation, Low-Code, Digital Twin, Command Center — ~421 of the backend's ~1,168 total API endpoints). One domain (governance) was spot-checked and found to have a real, differently-named, non-overlapping table set instead of a true gap — the same pattern may apply to some of the other 10 clusters, not yet checked individually.

### RLS, Triggers, Indexes (New This Phase)

- **RLS policies**: present across 9 of the 9 migration files, most substantially in `foundational_tables` (6 policy-related statements) and `gari_motors_full_schema` (62 — the largest concentration, consistent with that migration's own stated design goal of "RLS enabled on every table"). **Resolved, not left as an open question**: checked `backend/utils/supabase.js` directly — the backend's Supabase client is initialized with `SUPABASE_SERVICE_KEY` (the service-role key), not an anon or authenticated-user key. Service-role connections bypass RLS entirely by Supabase's own design; this is standard, expected behavior for a trusted backend server, not a misconfiguration. **This means every RLS policy across every migration is currently inert for this application's actual security model** — real authorization enforcement happens entirely at the application layer (the `protect` middleware, per-route/per-controller role checks), not at the database layer. This is a legitimate architectural choice many backend-service applications make, but it should be stated plainly rather than left implying database-layer protection that doesn't actually apply here: **if any future code path ever connects to Supabase with a non-service-role key, the RLS policies would then become the operative security boundary, and their correctness would need auditing at that point** — not required now, since they are provably not load-bearing today.
- **Triggers**: 6 files define triggers, most substantially `gari_motors_full_schema` (11) and `car_listing_flow` (8). Not individually audited for correctness this phase — flagged for a dedicated pass.
- **Indexes**: `foundational_tables` alone defines 17 indexes on the core tables (`cars`, `bids`, `favorites`, `car_views`) — a reasonable baseline for the tables that matter most. Index coverage for the 69 other "real" tables outside this core set not audited this phase.

### Financial Type Integrity (Task 5, Verified)

Checked directly, not assumed: `cars.price`, `bids.amount`, `escrows.amount`/`commission`/`"sellerAmount"` are all declared `NUMERIC` (arbitrary-precision decimal), never `FLOAT`/`REAL`/`DOUBLE PRECISION`. **This is correct, safe practice already in place** — no floating-point financial arithmetic risk found in the schema layer itself. Application-layer arithmetic (JS `Number` usage in controllers/services) was not audited this phase for precision-loss risk when values move between Postgres `NUMERIC` and JS `number` — flagged as a real, separate question (JS `number` is IEEE-754 double-precision float; Postgres `NUMERIC` is not; a naive `Number(row.amount)` conversion can lose precision for sufficiently large or precise values) not resolved here.

**A real, concrete inconsistency found**: the `escrows` table mixes column-naming conventions — `buyer`, `seller`, `amount`, `status` are plain lowercase, while `"sellerAmount"`, `"fundedAt"`, `"vehicleConfirmedAt"`, `"createdAt"`/`"updatedAt"` are quoted camelCase. This is unusual for a Postgres schema (quoted mixed-case identifiers require exact-case quoting in every future query) and is the kind of drift Task 2 asks to classify — see `docs/DATABASE_MIGRATION_PLAN.md`.

---

## 2. What This Phase Did Not Independently Re-Verify

Per this program's own established discipline of not re-doing work that's already been rigorously done: the Mongoose-compatibility shim's comprehensiveness (`$set`/`$regex`/`$ne`/`$gte`/`$in`/`$text`/`$or`/`$and`/`.populate()`/`.distinct()`/`.countDocuments()`), the `location`/`location_city` field-alias bug and fix, and the `auction.service.js` duplicate-deletion are all carried forward from `phase-02-database.md`, `phase-05-schema-correction.md`, and `phase-06-field-alias-fix.md` respectively — re-cited here, not re-investigated from scratch.
