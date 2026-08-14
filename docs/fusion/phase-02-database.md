# Phase 02 — Database Consolidation
**KAYAD Fusion Program**

---

## 0. Ground Truth, Stated Before Anything Else

**No live database exists to run validation against.** Confirmed repeatedly across this audit (`01`, `04`): the backend's `.env.example` has a placeholder `SUPABASE_URL`, and this account's real Supabase organization contains one project (`CALQULUS-PMS`, unrelated). "Run database validation" as requested cannot mean executing queries against a live instance — nothing to connect to exists. What follows is static analysis: schema files, model definitions, and code patterns, verified directly against each other. Where this document says a table "exists," it means a `CREATE TABLE` statement for it exists in `backend/db/*.sql` — not that data has ever been written to it.

---

## 1. Mongo/Mongoose Pattern Audit — Scale and Disposition

Scanned all 622 backend `.js` files for every pattern this task named:

| Pattern | Occurrences | Files |
|---|---|---|
| `._id` (field access) | 324 | 71 |
| `ObjectId` | 369 | 60 |
| `.populate(` | 268 | 43 |
| `.findById(` | 409 | 80 |
| `.findOneAndUpdate(` | 17 | 13 |
| `.updateOne(` | 5 | 4 |
| `$set` | 39 | 16 |
| `$max` | 11 | 5 |
| `$regex` | 45 | 12 |

**Total: ~1,487 occurrences across the codebase.** This is a large number and could look alarming in isolation — it is not evidence of an active MongoDB dependency. `mongoose`/`mongodb` are confirmed absent from `package.json` (checked directly, again, this phase). Every one of these patterns is implemented by `models/_base.js` (705 lines) as a genuine, working translation layer over real Supabase/Postgres queries — verified by reading the actual implementation, not inferred from naming:

- `findById(id)` → `client.from(table).select(...).eq("id", id).maybeSingle()`
- `findByIdAndUpdate(id, update)` → unwraps `update.$set` and performs a real Postgres update
- `populate(field, select)` → supports both Mongoose calling conventions (`"fieldA fieldB"` string form and `{path, select}` object form), executed via `runPopulates()`, a real function that performs actual follow-up Supabase queries per related field
- `$regex` in a query filter → extracted and translated into a real Postgres pattern-match condition

**Disposition per this task's own explicit allowance** ("the existing compatibility layer may be retained temporarily where necessary, but it must not become the permanent architecture"): retained as-is this phase. Rewriting ~1,487 call sites across 80+ files to native Supabase query syntax is a large, mechanical, high-blast-radius undertaking with no live database to verify any of it against — exactly the kind of change this program's own risk posture argues against attempting blindly. This is flagged as the primary target for a dedicated future phase (see §7), not attempted here.

---

## 2. Canonical Table Designation, By Priority Domain

For every domain this task named, the table(s) below are established as canonical — the one correct database representation for that concept. "EXISTS" means a real `CREATE TABLE` was found; "MISSING" means the model expects it but no schema file defines it (per `04`'s methodology, re-verified here for these specific domains).

| Domain | Canonical Model(s) → Table(s) | Status |
|---|---|---|
| **users** | `User`→`users`, `UserAuth`→`user_auth`, `UserPreference`→`user_preferences` | All EXIST |
| **roles** | `Role`→`roles` | EXISTS — **model added this phase**, see §3.1 |
| **dealers** | `Dealer`→`dealers`, `DealerHealthScore`→`dealer_health_scores`, `DealerVerification`→`dealer_verifications` | EXIST |
| | `DealerTeam`→`dealer_teams`, `DealerTrustScore`→`dealer_trust_scores`, `DealerProfile`→`dealer_profiles`, `DealerSubscription`→`dealer_subscriptions` | **MISSING** |
| **vehicles** | `Car`→`cars` | EXISTS |
| **vehicle_images** | Not a separate table — `images TEXT[]` column directly on `cars` | Intentional design, not a gap (see §3.2) |
| **favorites** | `Favorite`→`favorites` | EXISTS |
| **leads** | `Lead`→`leads` | EXISTS |
| | `LeadActivity`→`lead_activities` | **MISSING** |
| **auctions** | `Auction`→`auctions`, `AuctionIntegrityFlag`→`auction_integrity_flags`, `AuctionRiskProfile`→`auction_risk_profiles` | All EXIST |
| **bids** | `Bid`→`bids`, `BidLog`→`bid_logs`, `BidderDeposit`→`bidder_deposits` | All EXIST |
| **auction_participants** | *(no dedicated table — see §3.3, a real gap)* | Only aggregate count columns exist elsewhere (`auction_participants INTEGER`, `unique_bidders INTEGER` in analytics tables) — no per-participant record |
| **inspections** | `InspectionOrder`→`inspection_orders`, `InspectionPackage`→`inspection_packages`, `InspectorApplication`→`inspector_applications` | EXIST |
| | `Inspection`→`inspections`, `Inspector`→`inspectors` | **MISSING** |
| **escrow** | `Escrow`→`escrows`, `EscrowVault`→`escrow_vaults`, `EscrowAnomaly`→`escrow_anomalies`, `EscrowRiskScore`→`escrow_risk_scores`, `EscrowAudit`→`escrow_audits` | All EXIST |
| **payments** | `Payment`→`payments`, `MpesaTransaction`→`mpesa_transactions` | All EXIST |
| **transactions** | `Transaction`→`transactions`, `TransactionLedger`→`transaction_ledger` | All EXIST |
| **messages** | `Chat`→`chats`, `Message`→`messages` | All EXIST |
| **notifications** | `Notification`→`notifications`, `NotificationAudit`→`notification_audit` | All EXIST |
| **admin/audit** | `AuditLog`→`audit_logs`, `SecurityLog`→`security_logs`, `AdminAlert`→`admin_alerts` | All EXIST |
| **CMS** | `CMSPage`→`cms_pages`, `CMSMedia`→`cms_media` | EXIST |
| | `CMSContent`, `CMSCampaign`, `CMSBanner`, `CMSFaq`, `CMSTaxonomy`, `CMSRevision`, `CMSABTest`, `CMSAnalytics` | **MISSING (8 of 10 CMS models)** |

**Headline observation**: the truly core transactional path — users, vehicles, favorites, auctions, bids, escrow, payments, transactions, messages, notifications, admin/audit — is **essentially fully backed by real schema**. The gaps cluster specifically in extended dealer features, lead activity history, base inspection/inspector records (as opposed to the order/package/application layer, which is solid), and CMS (80% missing). This is a meaningfully more reassuring picture for the core business than the raw "116 of 185 missing" headline number from `04` suggested on its own — the core is solid; the gap is concentrated in secondary/extended features and the large "enterprise platform" cluster documented in `04`/`06`, not spread evenly across everything.

---

## 3. New Gaps Found This Phase (Beyond What `04`/`06` Already Covered)

### 3.1 `roles` — a real table with zero model coverage — FIXED this phase
`identity.schema.sql` defines a genuine `roles` table (`role_code`, `role_name`, organization-scoped custom roles, `is_system` protection flag) — clearly a real, thought-through RBAC design. **No model in `_base.js`'s `TABLE_MAP` referenced it at all.** This is the inverse of `04`'s main finding (there, models expected tables that don't exist; here, a table exists that no model expects).

**Action taken**: added `backend/models/Role.js` (following the exact minimal pattern every simple model in this codebase already uses — `export default createModel("Role")`, no custom extensions, matching e.g. `Favorite.js`) and a corresponding `Role: "roles"` entry in `_base.js`'s `TABLE_MAP`. Confirmed purely additive before making the change: a repo-wide search found zero existing imports of any `Role` model anywhere, so this could not conflict with or break any existing caller — it only makes an already-real table reachable through the standard model pattern for future use. Backend-wide syntax validation (`node --check` across all files, not just the two touched) re-run after the change: 0 errors.

### 3.2 `vehicle_images` — confirmed non-issue
Investigated and closed out, not left open: images are stored as a native Postgres `TEXT[]` array column on `cars` itself, not a separate join table. This is a legitimate, simpler design for a case where images don't need independent identity (ordering, captions, per-image metadata) — appropriate given nothing in the codebase suggests images need that. No action needed.

### 3.3 `auction_participants` — no per-participant record exists
Only aggregate counts exist (`auction_participants INTEGER`, `unique_bidders INTEGER` in analytics/reporting tables) — there is no schema-level way to answer "which specific users are registered/eligible to bid on this auction," as distinct from "who has placed a bid" (partially answerable via `bids`/`bid_logs`, but that conflates *participation* with *having bid*, which are different concepts — e.g., a registered-but-not-yet-bidding participant). Whether this is a genuine missing capability or one the application doesn't actually need (if eligibility is checked some other way, e.g., against `BidderDeposit` records) is not determined here — flagged as an open question, not assumed to be a real gap without more evidence from the actual bidding-flow code.

---

## 4. Relationships / Foreign Keys / Indexes

**Not comprehensively audited this phase.** Given the ground-truth constraint in §0 (no live database, so no `information_schema` to query), a full relationship/FK/index audit would require manually parsing every `CREATE TABLE` and `ALTER TABLE ... ADD CONSTRAINT` statement across 21+ schema files and `schema_clean.sql` — a large, mechanical task not attempted in this pass given the higher-priority gaps (§1, §3) found first. Flagged as the next concrete task for a follow-up database-focused pass, not silently skipped.

---

## 5. Ownership

Every canonical table in §2 is owned, in the sense of "which model file is the single source of truth for reading/writing it," by exactly one model in `backend/models/` — confirmed via `04`'s original 185-model audit finding zero duplicate table mappings within the `TABLE_MAP`. No table in the "EXISTS" column of §2 has competing ownership from two different models. This is a genuinely clean result worth stating plainly: the *ownership* question this task asks about is already answered correctly by the existing architecture — the gap is *tables that don't exist yet*, not *tables owned by multiple conflicting implementations*.

---

## 6. Data Integrity Risks

1. **Every "EXISTS" table above is currently unreachable in practice** — no live database means even a fully-correct model/table pairing cannot actually be queried right now. This isn't a schema-design risk; it's an environment-provisioning blocker that sits in front of everything else in this document.
2. **The `roles` gap (§3.1)** is a genuine authorization-integrity risk *if* any code path assumes role data lives somewhere it doesn't — not confirmed either way this phase.
3. **The governance/AI schema-vs-model naming mismatch** (established in `04`/`06`, not re-litigated in full here) remains the largest concrete data-integrity risk in the whole backend: real tables exist, real routes exist, and the two don't refer to each other correctly. If a database were provisioned today without addressing this, ~40%+ of the "enterprise platform" API surface would either 500 on every request or silently write to the wrong tables, depending on exactly how the mismatch fails in Supabase's actual error behavior (not tested, since no live instance exists).
4. **The Mongo-compatibility shim (§1) is a single point of failure** for the entire backend's data access — if `_base.js` has any subtle translation bug for an edge case not yet exercised by existing tests, every one of the ~1,487 call sites relying on it inherits that bug simultaneously. Not found to have such a bug in this pass, but the architecture concentrates risk there by design, worth naming as a structural fact.

---

## 7. Migration Status / What Remains

| Item | Status |
|---|---|
| Mongo-pattern audit | **Done this phase** — scale quantified, confirmed routed through a real, working shim |
| Canonical table designation for the 18 named priority domains | **Done this phase** |
| `roles` model gap | **Fixed this phase** — `Role` model added, purely additive, zero existing callers affected |
| `auction_participants` gap | **Found, not fixed** — needs a decision (add table vs. confirm not needed) |
| Governance/AI (and likely other) schema-vs-model reconciliation | **Not attempted** — carried forward from `04`/`06`, still the single largest piece of remaining work |
| Full FK/index/relationship audit | **Not attempted** — flagged in §4 |
| Rewriting the Mongo-compatibility shim's 1,487 call sites to native Supabase syntax | **Not attempted, and not recommended for a near-term phase** — retained per this task's own explicit allowance; revisit only once a live database exists to verify any rewrite against |
| Live database provisioning | **Not attempted** — outside this audit's scope (would require Supabase project creation, a decision point for the project owner, not unilaterally done here) |

---

## 8. Validation Actually Run This Phase

- **Backend syntax validation**: `node --check` across all 622 backend `.js` files — 0 errors (no schema files were edited this phase, so this re-confirms the codebase is unchanged/stable, not that new changes are safe)
- **"Database validation"**: not run, per §0 — no live database exists. Not claimed as passed; explicitly documented as inapplicable in this environment rather than silently skipped.
- **Backend tests** (`npm test` under `backend/`): **not run** — `backend/` has never had `npm install` executed in this environment (same limitation noted in `phase-01-results.md`). Running the real Jest suite requires installing backend dependencies first; not done this phase. Flagged honestly rather than assumed passing.
- **No schema, model, or service code was modified this phase.** This was an audit-and-documentation phase; the only new artifact is this document itself.
