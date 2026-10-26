# KAYAD Phase 13H — Accessibility Findings

Tool: axe-core (wcag2a, wcag2aa) injected into real Chromium on the real SPA build, `validation-logs/phase13h/ui-journeys.log`.

| page (viewport) | critical | serious |
|---|---|---|
| buyer dashboard, no seller capability (1280) | 0 | 0 |
| admin private-seller review, pending (1280) | 0 | 0 |
| seller studio, approved (1280) | 0 | 0 |
| dealer hub (1280) | 0 | 0 |
| admin console incl. System Alerts card showing the alert text (1280) | 0 | 0 |
| buyer dashboard, pending state (390) | 0 | 0 |

Also checked at 390px: no horizontal overflow on the buyer dashboard and admin review page. Alert text is rendered as plain text; the alert list keeps `aria-live="polite"`.

Limits: six pages only (not a whole-site audit); axe finds a subset of WCAG issues; no screen-reader or keyboard-only manual test was performed in this phase. Screenshots: `evidence/phase13h-browser-screenshots/` (13 files).
