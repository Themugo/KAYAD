# KAYAD Public Support Surface Audit — 2026-10-12

## Scope and baseline

- Canonical foundation: `KAYAD-STAGE13-PUBLIC-AUCTION-CONVERGENCE-20261012.zip`
- Foundation SHA-256: `310ad3be0bfe400d9a1079b750f4dabcabe75311e4729f672eae07476cb0fb78`
- Scope: public Support page, CMS FAQ delivery and public response shape, customer support case state isolation, customer-facing errors, accessibility of the shared notice ticker.
- Approach: inspect existing source and preserve the current KAYAD architecture; targeted fixes only. No new support system, route family, database table or migration was introduced.

## Findings and resolutions

### SUP-PUB-01 — Public FAQ API was behind authentication (High)

**Evidence:** `backend/routes/cmsRoutes.js` registered `/faqs` after `router.use(protect)`, while the Support FAQ client calls `/api/cms/faqs` on a public page and intentionally falls back to bundled copy when the request fails. This made signed-out visitors receive the fallback dataset instead of current CMS content. The observed fallback data had 14 entries, placed Account & Access content under Transfer, and showed zero Account & Access entries.

**Fix:** moved only the FAQ list/detail reads ahead of the authentication boundary. FAQ writes remain after `router.use(protect)` and retain their existing role gates. Public FAQ responses now use an explicit allow-list projection.

### SUP-PUB-02 — Public FAQ payload could expose editor metadata (Medium)

**Evidence:** the generic CMS FAQ model returns row fields including `createdBy` and `updatedBy`; returning whole model records from public FAQ reads was unnecessary.

**Fix:** added `publicFaqProjection` with only public content fields (`id`, question, answer, category, order, popularity, related questions, next step and timestamps). Both list and detail reads use this projection. Editor audit identity fields are not returned.

### SUP-PUB-03 — Anonymous FAQ popularity tracking could not work and lacked a route-specific limit (Medium)

**Evidence:** `trackFaqOpened` is intentionally fire-and-forget from the public FAQ component, but the popularity route was also behind `router.use(protect)`.

**Fix:** moved the popularity signal endpoint to the public route block and added a dedicated 30-requests-per-minute IP limiter. FAQ content mutation routes remain protected.

### SUP-PUB-04 — Customer support state was not isolated across account changes (High)

**Evidence:** the Support page retained ticket lists, selected ticket detail/messages, submission confirmation and drafts when `user.id` changed. In-flight requests could also resolve after a different account became active and overwrite the current screen.

**Fix:** account-generation and request-sequence guards now reject stale list/detail/action responses. Customer-specific tickets, selected details, drafts, errors, feedback and submission confirmations are cleared on logout/account switch. Rendering is additionally gated by the owner ID associated with the loaded data so old state is hidden immediately when the active account changes.

**Security boundary retained:** backend support routes still require authentication; customer service lookups remain owner-scoped and return the customer projection. Internal notes are filtered by the server serializer. No staff workspace routes were made public.

### SUP-PUB-05 — Server errors could surface raw backend details (Medium)

**Evidence:** generic 5xx messages from the API error wrapper could be rendered directly in customer-facing support panels.

**Fix:** mapped network, authentication, forbidden, missing-case, rate-limit and server failures to customer-safe messages. Server failures no longer display raw database/controller messages. A failed case-detail request now displays a retry action and a route back to the user's case list instead of remaining indefinitely on “Loading case history…”.

### SUP-PUB-06 — Case list grouped closed cases under “Active” (Low)

**Fix:** active cases and resolved/closed history are rendered in separate groups. A failed refresh retains the previously loaded list and adds a non-destructive warning instead of replacing usable data with an error-only panel.

### SUP-PUB-07 — FAQ fallback category and coverage were inconsistent (Medium)

**Evidence:** the bundled Account & Access FAQ had category `transfer`, which caused Transfer to show two entries and Account & Access zero entries. The fallback omitted the existing case-reopen guidance seeded by the CMS migration.

**Fix:** corrected the fallback category, added the reviewed case-reopen answer, and normalized known legacy CMS category spellings such as `account_access`, `auction` and `inspection` to the existing public filters. Malformed CMS FAQ rows are filtered so one bad row cannot break the whole help page.

### SUP-PUB-08 — Public claims and controls needed alignment (Low)

- Removed the inaccurate claim that the support form can attach a typed financing reference; the actual form only offers reference kinds supported by its category mapping.
- Added accessible expanded-state metadata to FAQ question controls.
- Added accessible labels and pressed state to the resolution rating controls and labels to text inputs.
- The public notice ticker duplicates items visually to make its marquee loop seamless. The repeated loop is now hidden from assistive technology while the first copy remains available.

## Validation evidence

- `node scripts/validate-public-support-surface.mjs`: **21/21 PASS**.
- `node scripts/validate-cms-schema.mjs`: **PASS**.
- TypeScript/TSX syntax transpilation (not typechecking): **6/6 files passed** — `SupportView.tsx`, `SupportFAQ.tsx`, `cmsFaqApi.ts`, `TopNoticeStrip.tsx`, `supportView.test.tsx`, `supportFaq.test.tsx`.
- `node --check`: **PASS** for `backend/controllers/cmsController.js`, `backend/middleware/rateLimiter.js`, `backend/routes/cmsRoutes.js`, and `scripts/validate-public-support-surface.mjs`.
- Added frontend regression tests for account switching, stale list responses, raw server-error suppression, Account & Access fallback filtering, and legacy CMS category normalization.

## Not certified in this environment

- Jest/Vitest execution, full TypeScript typecheck, production build, browser/Playwright tests and live unauthenticated HTTP verification were not run: project dependencies are not installed in this workspace. Available Node is `v22.16.0`, below the repository's `>=22.22.2` requirement.
- No live Supabase query, migration, deployment, commit, push, customer support case, email, or provider transaction was performed.
- The public CMS FAQ route fix is source-validated. Confirm its behavior after the normal backend deployment by opening `/api/cms/faqs?limit=100` in a signed-out browser and verifying it returns only public FAQ fields and the expected CMS rows.

## Release classification

**Source-validated local release candidate; not runtime- or production-certified.**
