# KAYAD Phase 13H — Admin Alert Message Display (UI / data-contract correction)

**Classification: UI/data-contract correction. No reconciliation, escrow, ledger or other financial logic was changed.**

## Reproduction (13G tree)
The seeded writer-shaped alert rendered "Alert message unavailable" (screenshot `evidence/phase13g-browser-screenshots/admin-console-alerts.png`, carried from 13G).

## Root cause
`reconciliationService.sendAlerts()` stores the text at `data.description` (`{ reportId, issueType, description, transactionId, amountDifference }`). `GET /api/admin/alerts` returns the rows untouched (`{ success, alerts, unreadCount }`). Three UI consumers read different fields:
| consumer | read | result for the writer shape |
|---|---|---|
| `src/features/AdminAlertsPanel.tsx` (command-centre rail) | `message → title → description` | fallback text |
| `src/pages/admin/OperationsControlRoom.jsx` | `message → title → description` | fallback text |
| `src/pages/admin/components/AdminAlertsPanel.jsx` | `data.message → message → type` | showed `payment_failure` |

## Fix
New `src/utils/adminAlertMessage.ts` (`getAlertMessage`, one reader): `message → title → description → data.message → data.title → data.description`; strings only (objects, arrays, numbers, blank strings are ignored), trimmed, capped at 300 characters, deliberate fallback `Alert message unavailable` (the sidebar list keeps its existing fallback of the alert type). The three consumers call it. Messages are rendered as React text (no `dangerouslySetInnerHTML`). The backend and API contract are unchanged.

## Tests
- Vitest `src/__tests__/features/Phase13hAdminAlertMessage.test.tsx`, 9 tests: writer shape, legacy shapes and precedence, malformed/empty/non-string/null/array/object payloads, 5000-character cap, rail panel shows the text and not the fallback, markup (`<img onerror>`) rendered inert, malformed list entries fall back without crashing, empty and failed-request states unchanged, sidebar list prefers `data.description` then the type.
- Real HTTP + database `phase13h_route_matrix.mjs`: H3 writer-shaped alert round-trips with `data.description` intact; H4 the API adds no `message` (payload not rewritten); H5 access boundary anonymous 401, buyer/dealer 403, admin/superadmin 200.
- Browser journeys AL4/AL5 (real SPA, real backend): the System Alerts card shows the seeded description; the placeholder is absent.
- Existing tests that assert the old fallback text still pass (full frontend suite 861 passed).
