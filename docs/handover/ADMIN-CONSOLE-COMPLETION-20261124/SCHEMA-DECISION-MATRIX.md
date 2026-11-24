# Schema dependency decision matrix (13 gaps) — 2026-11-24

Evidence: table names resolved through the model shim (`camelToSnake`, plural) and checked against the catalog of a disposable database built from all 215 migrations. NOT VERIFIED against hosted beyond the earlier read-only catalog check.

## A. Five provisioned by `20261124100000` (local PASS; hosted NOT APPLIED)
| Feature | Implementation | Schema (local) | API | UI | Verified by | Next action | Owner approval |
|---|---|---|---|---|---|---|---|
| Reports | complete controller + routes | `reports` created, RLS, no client grant | PASS | PASS | journey 27 A1–A11, jest stage3a | apply migration | Yes (hosted migration) |
| Feedback | complete | `feedback` created | PASS | PASS | journey 27 B1–B5 | apply migration | Yes |
| Announcements | complete (drafts only; no delivery path exercised) | `announcements` created | PASS | PASS | journey 27 C1–C6 | apply migration; send path stays NOT VERIFIED | Yes |
| Market data | complete | `market_data` already on hosted; no-op | PASS | PASS | journey 27 D1–D2 | none | No |
| NTSA verification requests | complete (approval defect fixed) | already on hosted; no-op | PASS | PASS | journey 27 D3–D7 | none | No |

## B. Eight NOT PROVISIONED (honest 503 `FEATURE_NOT_PROVISIONED`; nothing invented)
Each row: routes counted from the router file; "tables" are the models the controllers use. A model has no table when none of `snake`, `snakes` exists in the catalog.
| Feature | Product requirement evidence | Implementation | Schema | API | UI | Existing related objects (NOT the same feature) | Recommended next action | Owner approval |
|---|---|---|---|---|---|---|---|---|
| Automation studio | 43 routes, full controller set; no sidebar entry; reachable from the Specialist Studios panel | complete code | 6 of 7 models have no table (ApprovalChain, AutomationTask, NotificationTemplate, ScheduledJob, Workflow, WorkflowAction); BusinessRule maps to `business_rules` which exists | 503 not provisioned | honest unavailable state | `business_rules`, `approval_rules`, `intelligence_scheduled_reports` | owner decides: provision or retire | **Yes** |
| Configuration studio | 45 routes | complete code | all 7 models missing (ConfigEntry, FeatureFlag, ReferenceData, …) | 503 | honest | `platform_config` (Settings), `country_configurations` | decide whether Settings supersedes it | **Yes** |
| Low-code studio | 36 routes | complete code | all 7 models missing | 503 | honest | none | decide: provision or retire | **Yes** |
| VXP (visual experience) | 38 routes | complete code | all 9 models missing | 503 | honest | `cms_*` tables serve the live CMS | decide vs CMS | **Yes** |
| XOS (experience OS) | 46 routes | complete code | all 8 models missing | 503 | honest | `marketing_campaigns`, `cms_campaigns` | decide: provision or retire | **Yes** |
| AI platform | 26 routes | complete code | all 5 models missing | 503 | honest | `ai_decision_runs` (AI decision governance is provisioned separately) | decide: provision or retire | **Yes** |
| Digital twin | 18 routes | complete code | all 4 models missing | 503 | honest | none | decide: provision or retire | **Yes** |
| Suspicious-bid flagging | 8 bid routes; table `bids` exists | read path implemented | column `bids.is_suspicious` not in migrations and nothing in the repository writes it | 503 | honest | `bids` (provisioned) | needs a product decision on flagging rules before any column is added | **Yes** |

## C. What was deliberately not done
- No tables or columns invented from frontend assumptions for the eight (no product rules or ownership exist for their data).
- No feature retired, deleted or hidden without authorisation. The routes, pages and APIs remain; only the data layer is absent.
- The error handler still treats missing objects elsewhere as 500 on purpose; only these routers use the 503 guard.

## D. Residual risks
- A feature owner may already have the tables in a hosted-only form. Check hosted catalogue before provisioning anything (read-only SELECT).
- If any of the eight is provisioned later, the 503 guard turns itself off automatically (it only converts "object does not exist" errors).
