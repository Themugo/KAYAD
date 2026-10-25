# KAYAD Phase 12 — Defect Register

| ID | Severity | Finding | Correction | Verification | Status |
|---|---|---|---|---|---|
| P12-001 | High visual consistency | Many established admin inline styles referenced undeclared legacy CSS variables, including `--text-muted`, `--border`, `--card`, `--surface`, `--text-primary` and status colors | Added 26 compatibility aliases inside `.kayad-admin-shell`, each resolving to an existing canonical admin token | Focused Phase 12 validator; brand palette, admin route and navigation validators | Corrected at source level |
| P12-002 | Medium | Operations Control Room error and health statuses relied on undefined or misleading legacy variables; `--orange` resolves globally to brand teal | Updated metric cards, alert severity colors, error text, stale-state text, activity icons and health labels to use canonical admin tokens | Focused Phase 12 validator; Phase 3 dashboard and Phase 5 operations validators | Corrected at source level |
| P12-003 | Medium | Alert status backgrounds and borders did not use one consistent semantic token set | Added warning, danger, information and neutral border tokens and applied existing semantic backgrounds | Focused Phase 12 validator; stylesheet parser | Corrected at source level |
| P12-004 | Release blocker | Compatible Node runtime and dependencies remain unavailable in this environment | Not bypassed; engine enforcement retained | `npm ci` attempt and runtime checks | OPEN / BLOCKED |
| P12-005 | Verification gap | Full typecheck, production build, unit tests and real browser checks remain unverified without dependencies/runtime | Retained as release gates | See validation matrix | OPEN / BLOCKED |
| P12-006 | Historical evidence gap | Stage 24 theme validator expects an older dated audit artifact absent from the foundation | Not fabricated; retained as an explicit evidence gap | Existing Stage 24 validator returns 13/14 | OPEN |

No backend or security-sensitive defect was modified. No production data or live integrations were touched.
