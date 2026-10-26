# Capability lifecycle certification

Evidence tiers used in this report set: [UNIT] unit tests · [INT] integration tests · [DB] real disposable PostgreSQL · [HTTP] real HTTP against the real Express backend + PostgREST + Postgres · [BROWSER] real Chromium against the built SPA + real backend + real Postgres · [STAGING] approved staging (NONE) · [NOT RUN] · [BLOCKED] · [APPROVAL] needs separate approval.

| Transition | Actor | Result | Evidence |
|---|---|---|---|
| none → pending (apply) | buyer | pending row, role/status untouched | [BROWSER] B3–B4, [HTTP] §A–B |
| duplicate / concurrent apply | buyer | 409, single row (PK) | [HTTP], [DB] T-series |
| pending → approved | admin | approved, `reviewed_by` = admin | [BROWSER] A3, [HTTP] §D |
| pending → rejected (reason) → re-apply → pending | admin / buyer | reason recorded; re-apply allowed | [BROWSER] X1–X5 |
| approved → suspended | admin | listings hidden, event tracked | [BROWSER] S1, [DB], [HTTP] §E |
| suspended → approved | admin | only policy-hidden, still-eligible listings restored | [BROWSER] R1, [DB] |
| approved/suspended → revoked | admin | hidden; reinstatable | [BROWSER] V1–V3 |
| self-approval / buyer calling admin API | buyer | 401/403, state unchanged | [BROWSER] U2, [HTTP] §C |
| concurrent conflicting decisions | 2 admins | one terminal state, listing hidden once | [DB] 5b, [HTTP] §I |
| legacy `individual_seller` (no row) | — | falls back to `users.status`; blocked states honoured | [HTTP] §J, [UNIT] |

Buyer access stayed intact in every state (dashboard, favorites, bidder card). Identity (`users.id`, role) never changed.
