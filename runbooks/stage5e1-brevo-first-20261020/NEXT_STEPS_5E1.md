# Stage 5E.1 — Prioritised next steps

**P0 — today, no hosted change**
1. Push this package to a **branch** and open a PR (not straight to `main`) so Gitleaks/CodeQL/CI can go green before any production deploy; confirm the Gitleaks job passes on the corrected line. (Owner)
2. Make "Secret Scan (gitleaks)" and "CI" required status checks on `main` (repo setting). (Owner)

**P1 — owner-supplied read-only evidence (no authorisation to mutate needed)**
3. Say whether the hosted project is production or staging, and give the deployed commit for frontend and backend (dashboards). 
4. On the machine/host that has the real environment: `node backend/scripts/brevo-readiness.mjs` then `… --live-readonly` and paste the JSON (it contains no secret). 
5. On the host shell: `node backend/scripts/owner-bootstrap.mjs --verify-designated "<owner-1>,<owner-2>"` (booleans only). Confirm the second spelling.
6. Brevo dashboard: sender `BREVO_FROM_EMAIL` validated; domain authenticated (SPF/DKIM/DMARC). 

**P2 — decisions**
7. D-5E2-1 (legacy-mode verification = activation vs wait for governance), D1/privilege items from 5B/5D.
8. Approve (or not) the candidate Node-24 workflow patch as a separate PR.

**P3 — engineering (separate, tested changes)**
9. Align "email configured" predicates (F-5E1-03) and make a missing `BREVO_FROM_EMAIL` fail visibly. 
10. Apply the commit-after-acceptance pattern to password reset (F-5E1-04); redesign owner-invitation resend as two-phase (F-5E1-05) **before** the governance migration is approved.
11. Treat permanent 4xx as non-retryable in `withRetry`; clear the timeout timer (F-5E1-07).
12. Fix `dependabot-auto-merge.yml:113`; review the 8 historical Gitleaks lines; decide on a baseline.

**P4 — only after P1–P2 and explicit, scoped authorisation**
13. Read-only hosted inventory re-run (SELECT only); export of the 38 hosted-only migrations; reconciled forward/rollback plan; staging migration; then — and only then — the owner clicks *Resend verification email* (a real Brevo send) and, per D-5E2-1, the governance bootstrap.
