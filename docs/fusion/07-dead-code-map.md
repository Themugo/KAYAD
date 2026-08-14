# 07 — Dead Code Map
**KAYAD Fusion Audit — Document 7 of 12**

---

## 1. Controllers — Checked, and Genuinely Clean (After Catching My Own Bug)

A first pass checking whether any of the 75 backend controllers are never imported anywhere produced an alarming result: 42 of 75 apparently unreferenced, including `auctionController.js` — which is directly known to be imported by `auctionRoutes.js` (confirmed by direct inspection in `03`). That contradiction was the signal to stop and re-check the method rather than trust the output: the script's condition (`count <= 1`) incorrectly flagged anything referenced *exactly once* — the completely normal case of one controller imported by one routes file — as orphaned. Fixed to check for `count == 0` specifically, re-run, sanity-checked against the known-good `auctionController.js` case (now correctly shows 1 reference, not flagged).

**Corrected result: 0 of 75 controllers have zero references anywhere in the backend.** Every controller is imported by at least one other file. This is a genuinely clean, reassuring finding for this specific layer — recorded honestly including the bug that nearly produced a false alarm, for the same reason two similar methodology corrections were recorded earlier in this audit (`03` §5, and this session's broader history): a dead-code map is only as trustworthy as the counting method behind it.

---

## 2. Real Dead/Unreachable Code Found

### 2.1 Latent Dead Code: 116 Models With No Backing Table
Carried forward from `04-database-map.md`. Not "dead" in the traditional sense (the code itself isn't literally unreachable — the routes exist and are mounted), but **functionally inert**: any of the ~421 endpoints in the "enterprise platform" route cluster that actually tries to query its expected table will fail at runtime, in any environment where this backend is actually connected to a real database. This is the largest single category of non-functional code found in this audit by far. See `04` for the full breakdown by domain cluster and the important governance-schema nuance from `06` (some of these may have a real, differently-named table already — not yet checked domain-by-domain beyond governance).

### 2.2 Genuinely Unreachable Service Code: `inspectionBusinessCenter/` and `digitalInspection/`
Carried forward from `06-duplicate-map.md`. Both folders contain real, substantial service-layer code with serious design documentation (READMEs describing real business requirements), but have **no route file mounting them and zero internal cross-references from any other backend file** — confirmed via a repo-wide grep, not assumed. This is genuinely dead code by the strictest definition: nothing in this repository, at any layer, currently calls it. Unlike §2.1, this isn't even reachable via a mounted-but-failing route — there's no route at all.

### 2.3 NOT Dead Code: `v2.js`
Investigated and resolved in this pass, not carried forward as an open question: `routes/v2.js` is an explicit, self-documenting placeholder (`"KAYAD API v2 - Coming Soon"`, with commented-out future imports and an explicit comment: "This file is prepared for future API versioning"). This is intentional, healthy API-versioning preparation, not an abandoned or duplicate implementation. Recorded here specifically to close out the question `06` flagged as unresolved, so it doesn't get re-investigated later as if still open.

---

## 3. What Was NOT Checked in This Pass (Explicitly Deferred)

- **Models** (185 files): not individually checked for whether they're imported by any controller/service beyond the aggregate table-existence question already answered in `04`. A model with a real table could still theoretically be imported by zero controllers — not ruled out here.
- **Services** (73 top-level + many nested per-domain): not checked for orphaned status at all in this pass. Given the `inspectionBusinessCenter`/`digitalInspection` finding above, it's plausible other domain folders have similarly-unreachable service files — not verified either way for the other ~23 domain folders.
- **Frontend dead code**: already extensively covered in prior sessions (5 orphaned components removed, dead route aliases removed) — not re-audited here, referenced for completeness only.
- **npm dependency-level dead code** (installed packages never actually imported anywhere) — not checked in this pass.

---

## 4. Summary

| Layer | Checked? | Result |
|---|---|---|
| Controllers (75) | Yes, with a corrected method | 0 orphaned |
| Routes (92) | Yes (in `03`) | All mounted, directly or via `v1`/`v2` aggregators |
| Models (185) vs. database tables | Yes (in `04`) | 116 of 185 expect a non-existent table |
| `inspectionBusinessCenter` / `digitalInspection` services | Yes (in `06`, restated here) | Genuinely unreachable, zero references anywhere |
| `v2.js` | Yes | Confirmed intentional placeholder, not dead code |
| Models' own import usage (beyond table existence) | No | Deferred |
| Services generally (beyond the 2 flagged folders) | No | Deferred |
| npm dependency usage | No | Deferred |
