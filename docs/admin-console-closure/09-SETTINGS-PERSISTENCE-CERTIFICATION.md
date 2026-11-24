# 09 — Settings persistence and effective behaviour

Endpoint `GET/PUT /api/admin/config` (Admin/Super Admin), public reader `/api/admin/public/config`.

| Step | Result | Check |
|---|---|---|
| Load: config + `recordedOnly` list truthfully exposed (e.g. `escrowReleaseDays` is recorded, not enforced) | 200 | A1 |
| Save non-financial setting as Admin | 200 | A2 |
| Reload read by a different actor shows the value | persisted | A3 |
| Feature that consumes it (public config) returns it | yes | A4 |
| Invalid input (bad email) refused; nothing from that request saved | 400, unchanged | A5 |
| Out-of-range `dealerCommission=99`, `escrowReleaseDays=0`, `maxListingImages=500`, `fontSizePct='abc'` | 400 each | A6 |
| moderator/marketing/hr/technical_support/personal/dealer cannot change | 403 | A7 |
| Anonymous cannot read (401) or change (401/403, CSRF or auth first) | yes | A8 |
| No unauthorised write reached the DB | yes | A9 |
| Response never carries payment secrets (blank + `has*` flags only) | yes | A10 |

**Recorded-only settings** (escrow/commission-adjacent) are shown as such and are not a claim of enforcement; they were not changed. `/admin/settings` is therefore *Fully workflow verified* for non-financial keys only. Browser sweep: Settings renders clean at 1440 and 390 for Super Admin.
