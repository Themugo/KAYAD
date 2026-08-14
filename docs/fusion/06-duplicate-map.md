# 06 — Duplicate Map
**KAYAD Fusion Audit — Document 6 of 12**

---

## 1. NOT a Duplicate — A Corrected Expectation: The Three "Inspection" Folders

`03-api-map.md` flagged `inspection/`, `inspectionBusinessCenter/`, and `digitalInspection/` as a possible overlap worth investigating. Checked directly, including each folder's own `README.md`. **They are not duplicates.** They're three deliberately distinct layers of one broader inspection domain:

| Folder | Actual Purpose (per its own README) | Audience | HTTP-Reachable? |
|---|---|---|---|
| `inspection/` | "Inspection Marketplace" — booking, provider matching, settlement | KAYAD customers | **Yes** — `routes/inspectionRoutes.js`, mounted at `/api/inspections`, 11 endpoints |
| `inspectionBusinessCenter/` | Internal operational workspace for inspection *companies* to run their own business (staff dashboards, engineer management, business analytics) | Inspection company staff, not KAYAD customers | **No route file exists at all** |
| `digitalInspection/` | The actual "150-Point Digital Inspection Engine" — structured evidence capture, report generation, tamper-resistant records | Inspectors performing an inspection | **No route file exists at all** |

This is a reasonable separation of concerns, not a Rule #2/#3 violation ("duplicate/parallel implementations"). **The real finding is different and arguably more serious**: `inspectionBusinessCenter/` and `digitalInspection/` are both substantial (each has multiple real service files and a serious, well-written README describing real business requirements), but **have zero HTTP entry point of any kind**, and — checked directly via a repo-wide grep — **are not imported or called by any other backend file either**, including `inspection/`'s own services. They are not "duplicated" — they are **fully designed, apparently unfinished at the wiring stage, and completely unreachable from anywhere, even internally.**

This is functionally closer to `04`'s "116 missing tables" finding than to true duplication: real design and service-layer work exists, but the last mile (routing, or even internal service composition) was never completed. Whether this reflects deliberate phased rollout (business-center and digital-inspection-engine features planned for a later release) or abandoned work is not determinable from the code alone — flagged for `12-fusion-roadmap.md` as a decision point, not resolved here.

---

## 2. Real Duplication Found: `governance.schema.sql` vs. the Governance Model Layer

Carried forward from `04-database-map.md` §5, restated here because this document is where it formally belongs: the governance **database schema** (14 tables: `entity_registry`, `dispute_cases`, `fraud_reports`, `risk_assessments`, etc.) and the governance **model layer's expectations** (`GovernancePolicy`→`governance_policies`, `ChangeRequest`→`change_requests`, etc.) describe almost entirely non-overlapping table names for what is conceptually the same "governance" domain. This is the clearest, most concrete evidence in this entire audit of genuine parallel/uncoordinated implementation — two different designs for the same capability, built without reference to each other. `04` flagged this pattern as worth checking across the other 10 "missing table cluster" domains; not yet done for any of them beyond governance itself.

---

## 3. Duplicate Project Copies — Confirmed, Not Just Suspected

`01-repository-map.md` flagged three full project checkouts on this filesystem (`KAYAD`, `KAYAD-live`, `KAYAD-verify`) sharing one GitHub remote, as something needing resolution but not yet directly compared. Now directly compared:

- **`KAYAD` and `KAYAD-verify` are near-identical**: a full recursive diff of their `backend/` folders shows only 3 files differ at all (`.env.example`, one monitoring dashboard file, `package-lock.json`) — consistent with these being two clones taken moments apart, or one being a copy of the other, rather than independently-evolved codebases.
- **`KAYAD-live`'s `backend/` differs from `KAYAD`'s in 41 files.** This divergence is **not from this session's own work** — this session has only read `backend/` during this audit, never written to it. The 41-file difference must come from a separate source: most plausibly the same earlier commits visible in `KAYAD-live`'s git log ("Fix TypeScript errors, backend bug, and test suite (full audit pass)") that don't appear in `KAYAD`/`KAYAD-verify`'s history. This session's own extensive frontend work (dozens of commits) is layered on top of that same divergence.

**Practical implication for fusion**: `KAYAD-live` is very likely the correct, most-current copy to treat as authoritative going forward — it has the most recent frontend work (this session's) and independently-diverged, seemingly bug-fixed backend code that the other two copies lack. But this is an inference from commit-message text and file-diff volume, not a confirmed statement from the project's owner about which checkout is intended to be canonical. **Flagged for explicit confirmation in `12-fusion-roadmap.md` or directly with the person running this project — not decided unilaterally here.**

---

## 4. What Was Checked and Found NOT Duplicated (Worth Recording as a Negative Result)

- The frontend's own duplication (5 orphaned components, dead route aliases) was already found and fixed in prior sessions — not re-litigated here, referenced for completeness.
- `v1.js` vs `v2.js` in `backend/routes/`: confirmed both exist and are both mounted (`/api/v1`, `/api/v2`). Not yet determined whether `v2` is a genuine newer API version superseding `v1`, or a parallel/experimental one — this is exactly the kind of "V2 without justification" question Rule #3 cares about, and is **not yet investigated** — flagged for a follow-up pass, not guessed at here.

---

## 5. Summary Table

| Suspected duplication | Verdict | Evidence |
|---|---|---|
| `inspection` / `inspectionBusinessCenter` / `digitalInspection` | **Not duplicated** — distinct, complementary layers; 2 of 3 unreachable | READMEs + route/import search |
| Governance schema vs. governance models | **Genuinely duplicated/parallel** | Direct table-name comparison |
| `KAYAD` / `KAYAD-live` / `KAYAD-verify` | **Duplicated project checkouts**, one (`KAYAD-live`) likely authoritative | Direct recursive diff |
| `v1.js` / `v2.js` route aggregators | **Unresolved** — could be legitimate versioning or duplication | Not yet investigated |
| Other 10 "missing table" clusters from `04` (CMS, VXP, AI, etc.) vs. their possible differently-named schema equivalents | **Unresolved** — governance was spot-checked, the rest weren't | Flagged in `04`, carried forward here |
