# Unavailable dashboard data sources and their confirmed causes

| Source (request) | State in your screenshot | Confirmed cause | Evidence |
|---|---|---|---|
| Dashboard statistics (`adminAPI.stats`) | Unavailable | Platform maintenance flag on → admin data routes answer **HTTP 503 `MAINTENANCE_*`** for every session, including the owner's (the owner lane is restore-only by design) | Local repro below |
| User records, pending dealer queue (`adminAPI.users` ×2) | Unavailable | same | same |
| Vehicle records (`adminAPI.cars`) | Unavailable | same | same |
| Audit log (`adminAPI.getAuditLog`) | Unavailable | same | same |

**How it was confirmed (local, real backend + real database + real browser):** signed in as the system owner, set the local `system_status.isMaintenanceMode=true`, reloaded the dashboard. The original build showed exactly your warning ("dashboard statistics, user records, pending dealer queue, vehicle records, audit log") with no cause (`evidence-admin-dashboard-20261027/browser_journey_before_original_build.log`). Healthy state: no warning. The same five requests fail together only when maintenance is on; when it is switched off locally the warning clears (check M2).

**Frontend integration defect (fixed):** the dashboard reported the five failures as one undifferentiated message. It now names the cause (maintenance / server / network / timeout / route not found / session) and offers Retry. Authorization denials (403) were already reported separately as "restricted", not "unavailable"; that is unchanged.

**What is NOT a frontend defect and was not touched:** the hosted maintenance flag. A read-only query earlier in this engagement showed hosted `system_settings.system_status` = `isMaintenanceMode: true`, set 2026-10-27 06:17:02 UTC, with the legacy shape (no scope/version). If that is still the hosted state, the hosted dashboard will show this warning for anyone, and ending it needs the separately pending **Operation A** (flag-off SQL) or **Operation B** (deploy the verified recovery code, then end maintenance from the Panic Room). Neither has been approved or run. This round did not re-read the hosted flag; its current value is unverified here.
Hosted login/recovery and the deployed backend version are **not** verified by anything in this package.
