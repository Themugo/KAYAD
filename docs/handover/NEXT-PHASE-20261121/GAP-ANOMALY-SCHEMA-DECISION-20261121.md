# GAP-ANOMALY — `escrow_anomalies` schema decision (2026-11-21)

Status: **DECISION REQUIRED (owner).** Nothing was changed in hosted, no migration was written for this table, no column was invented. The dashboard currently degrades visibly (see §6), not silently.

## 1. Evidence
| Source | Finding |
|---|---|
| Hosted (read-only SELECT) | Table exists, **0 rows**. Columns: `id uuid PK`, `escrow_id uuid`, `target_user uuid`, `type text`, `severity text`, `status text`, `description text`, `detected_at timestamptz NOT NULL default now()`, `resolved_at timestamptz`, `resolved_by uuid`, `metadata jsonb NOT NULL default '{}'`, `created_at`, `updated_at`. Indexes: pkey + `idx_escrow_anomalies_escrow`. RLS on, **no policies**, no CHECK/FK constraints. |
| Repo migrations (205) | **No migration creates `escrow_anomalies`.** Hosted has the table from an out-of-band change; an empty database built from the repo does not. |
| Application (`models/EscrowAnomaly.js`, `escrowAnomalyDetectionService.js`, `escrowOperationsController.js`) | Reads/writes `anomalyId, category, severity, riskScore, status, targetUser, targetUserRole, escrow, relatedEscrows, summary, evidence, riskFactors, detectionRules, reviewedBy/At, reviewNotes, actionTaken, actionNotes, actionTakenBy/At`. |
| Detection service | `Promise.all(allAnomalies, { ordered: false }.map(...))` (~lines 438/502) is a TypeError (`{...}.map` is not a function): **a scan can never persist an anomaly**, so 0 hosted rows is expected, not evidence of "no anomalies". |

## 2. Field-by-field comparison
| App field | Hosted column | Meaning | Gap |
|---|---|---|---|
| anomalyId | — | human reference | none (could be `id`) |
| category | `type` | large_transaction, rapid_refund, multiple_disputes, repeat_offender, escrow_abuse | rename only |
| severity | `severity` | low/medium/high/critical | compatible (no CHECK) |
| riskScore | — | 0–100 | **missing** (could live in `metadata`) |
| status | `status` | detected → under_review → confirmed → action_taken → resolved / dismissed | compatible; no CHECK |
| targetUser / targetUserRole | `target_user` / — | subject of the anomaly | role **missing** (derivable from users) |
| escrow / relatedEscrows | `escrow_id` / — | primary escrow / others | related **missing** (array) |
| summary | `description` | text | rename only |
| evidence, riskFactors, detectionRules | — | structured JSON | **missing** (fit `metadata`) |
| reviewedBy/At, reviewNotes | — | first review | **missing** (`resolved_by/at` cover only closure) |
| actionTaken/Notes/By/At | — | remedial action | **missing** |
| detectedAt | `detected_at` | | app has no field; created_at ≈ same |

## 3. Operational meaning and lifecycle (proposed, matches the app's statuses)
Owner of a record: system (detection) until reviewed; then the **reviewing staff member** (roles `admin`, `accounts`, `escrow_officer`). Lifecycle: `detected` → `under_review` (reviewer assigned) → `confirmed` | `dismissed` → `action_taken` (freeze / refund / escalate) → `resolved`. `resolved_at/by` are set on `resolved` or `dismissed`. A dismissed record must carry a note. Each transition should append an audit row (existing `escrow_audit` trail).

## 4. Options
**A — Additive migration (recommended).** One forward-only migration `CREATE TABLE IF NOT EXISTS escrow_anomalies (...)` followed by `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for the missing application fields (risk_score int, target_user_role text, related_escrows uuid[], evidence/risk_factors/detection_rules jsonb, reviewed_by uuid, reviewed_at, review_notes, action_taken, action_notes, action_taken_by, action_taken_at), CHECK constraints for status/severity/category (NOT VALID then validated, since hosted has 0 rows), FK `escrow_id → escrows(id)`, indexes on `(status, severity, detected_at)` and `target_user`, RLS deny-by-default retained (service role only). Safe on hosted: table is empty, every change is additive. Fixes empty-DB CI too. Requires **separate approval** before any hosted application.
**B — Code alignment to the hosted definition.** Map `category→type`, `summary→description`, and store everything else in `metadata`. No schema change; but loses queryability of reviewer/action fields, no constraints, and still needs a repo migration so empty databases have the table. Not recommended as the end state.
**C — Hide the queue.** Rejected by the directive (silent permanent hiding).

## 5. Recommendation
Adopt **A** (as a LOCAL-ONLY migration proposal), after owner confirmation of the lifecycle and field list above, and fix the `Promise.all` bug in the same change set with a unit test. Until then: no hosted action.

## 6. Current behaviour (implemented in the previous phase)
`escrowOperationsController` reports the anomalies queue as **unavailable** (explicit flag in the response) when the table or columns cannot be read, rather than returning an empty list; this is visible to operators and is not permanent hiding. Not VERIFIED against hosted data (0 rows).

## 7. Open questions for the owner
1. Approve option A and the status/category vocabularies?
2. Which roles may move a record to `action_taken` (suggest `admin` only, matching release/refund)?
3. Retention for dismissed records?
