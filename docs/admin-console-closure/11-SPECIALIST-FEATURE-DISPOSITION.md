# 11 — Specialist feature disposition

Eight specialist surfaces return 503 `FEATURE_NOT_PROVISIONED` (`provisioningGuard.js`) on their stats/dashboard APIs. Verified in the sweep (`failedApi`) and journey 27 E. Default per the master prompt: **retain as unavailable; no deletion.**

| Route | API (503) | Disposition | Reason |
|---|---|---|---|
| `/admin/automation` | `/api/automation/stats`, `/workflows` | Retain unavailable | Not provisioned; any-staff gate kept (journey 27 F7). Future phase. |
| `/admin/config` | `/api/config/stats` | Retain unavailable | Overlaps `/admin/settings`; recommend retirement review. |
| `/admin/lowcode` | `/api/lowcode/stats` | Retain unavailable | Future phase. |
| `/admin/vxp` | `/api/vxp/stats` | Retain unavailable | Future phase. |
| `/admin/xos` | `/api/xos/dashboard` | Retain unavailable | Future phase. |
| `/admin/ai` | `/api/ai/dashboard` | Retain unavailable | Future phase; AI governance migrations exist hosted. |
| `/admin/digital-twin` | `/api/digital-twin/dashboard` | Retain unavailable | Future phase. |
| `/admin/bids` (suspicious flagging only) | `/api/bids/admin/suspicious` | Retain unavailable (feature) | Bid history works; flagging not provisioned. |

Pages render an honest unavailable state (no fake data, no page errors). Recommendations are advisory; nothing was deleted or enabled.
