# KAYAD Public Support Change Ledger — 2026-10-12

| File | Change | Reason |
|---|---|---|
| `backend/controllers/cmsController.js` | Added public FAQ allow-list projection; bounded search term; projected list/detail responses | Prevent editor audit metadata from leaving the public CMS surface |
| `backend/middleware/rateLimiter.js` | Added anonymous FAQ popularity limiter (30/minute by IP) | Protect public popularity signal from trivial automated inflation |
| `backend/routes/cmsRoutes.js` | Moved FAQ reads and popularity signal before `router.use(protect)`; kept FAQ writes protected | Let public Support load live CMS FAQ content without exposing mutation routes |
| `src/features/SupportView.tsx` | Account-scoped state, generation/request guards, safe errors, retry state, active/history groups, accurate reference copy and accessible controls | Prevent cross-account stale case data and improve honest failure handling |
| `src/features/SupportFAQ.tsx` | Corrected fallback account category, added reopen guidance, normalized legacy category values, added `aria-expanded` | Correct filter counts and resilient/accessibility behavior |
| `src/services/cmsFaqApi.ts` | Validate response array and filter malformed FAQ records | Prevent malformed CMS data from breaking the public page |
| `src/components/TopNoticeStrip.tsx` | Hide duplicated marquee loop from assistive technology | Keep seamless visual animation without duplicate screen-reader announcements |
| `src/__tests__/features/support/supportView.test.tsx` | Added account-switch, stale-response and server-error regression tests; updated retry wording assertion | Cover the confirmed public case-state risks |
| `src/__tests__/features/support/supportFaq.test.tsx` | Added Account & Access fallback and CMS category-alias tests | Prevent category regressions |
| `scripts/validate-public-support-surface.mjs` | Added 21 source-contract checks | Repeatable local verification |
| `package.json` | Added `validate:public-support-surface` script | Make the focused audit repeatable |
| `KAYAD_PUBLIC_SUPPORT_AUDIT_20261012.md` | Added audit report | Findings, fixes and limitations |
| `KAYAD_PUBLIC_SUPPORT_CHANGE_LEDGER_20261012.md` | Added change ledger | File-level change traceability |
| `KAYAD_PUBLIC_SUPPORT_VALIDATION_MATRIX_20261012.tsv` | Added validation matrix | Machine-readable gate status |
| `KAYAD_PUBLIC_SUPPORT_EXECUTION_LOG_20261012.txt` | Added execution log | Reproducible record of executed checks |
| `KAYAD_STAGE14_SHA256_MANIFEST_20261012.txt` | Added hashes for stage-specific source/report files | Verify changed files independently of ZIP checksum |

No database migration was added. No production data or environment configuration was changed.
