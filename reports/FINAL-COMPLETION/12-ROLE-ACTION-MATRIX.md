# 12 — Role × Action Matrix

Observed HTTP statuses from journey 16 (real backend). Allowed = 2xx. Generated cell-by-cell against the code's permission model; mismatches would fail the journey (35/35 cells match).

| Probe | owner | manager | sales_agent | lot_agent | finance_officer | viewer |
|---|---|---|---|---|---|---|
| GET inventory | 200 | 200 | 200 | 200 | **403** | 403 |
| GET dashboard (earnings) | 200 | 200 | 403 | 403 | 200 | 403 |
| GET team (manage) | 200 | **403** | 403 | 403 | 403 | 403 |
| POST team/invite | 201 | **403** | 403 | 403 | 403 | 403 |
| GET subscription (owner only) | 200 | 403 | 403 | 403 | 403 | 403 |
| GET finance (owner only) | 200 | 403 | 403 | 403 | 403 | 403 |
| DELETE own listing | 200 | 200 | 403 | 403 | 403 | 403 |

Observations for the owner (not changed): `finance_officer` cannot see inventory; `viewer` has no permission at all although its description says "Read-only"; `manager` cannot manage the team (by design per role description).

Platform staff roles × admin write routes: `evidence/staff-write-matrix.json` (journey 14). Personal and dealer accounts → 403 on all; anonymous → 401/403.
Not covered: staff roles × every read endpoint; custom team roles (`dealer_team_roles`) matrix — NOT TESTED here.
