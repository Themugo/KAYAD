# Owner decision register & launch configuration proposal — Stage 5A

**Nothing below has been applied.** These are proposals. Hosted settings, accounts and schema are unchanged; the hosted `onboarding_policy` row does not exist yet, so the app already runs on restrictive launch defaults.

## Proposed initial configuration (confirm each value)
| Setting | Proposed | Alternatives | Notes |
|---|---|---|---|
| Private seller registration | `enabled`, email verification **required** (always on for sellers) | `disabled` | |
| Dealer onboarding | **YOU CHOOSE:** `approval_required` (recommended for the first dealer) or `self_onboarding` | `closed` | self_onboarding lets an unverified dealer list up to 3 vehicles; approval_required lists nothing until you approve |
| Listing moderation | `hold_for_review` | `auto_publish` (approved sellers only) | auto-publish never applies to unapproved accounts |
| Dealer/seller approval authority | `owner_only` | `admins` | |
| Listing decision authority | `owner_only` | `admins` | |
| `rejected` listing status | **keep gated**; use **Hide** | approve migration `03B_G2_CANDIDATE…` | see D3 |

Defaults vs saved: with no saved row the app uses `approval_required / hold_for_review / owner_only / owner_only`, sellers enabled; unreadable or corrupt storage ⇒ everything restrictive (dealers `closed`, sellers disabled, hold, owner_only). The first owner **Save** creates the row (revision 1).

## Decisions
| ID | Decision | Recommendation | Needed before |
|---|---|---|---|
| D1 | Dealer mode for the first dealer | approval_required | first dealer |
| D2 | Listing moderation | hold_for_review | first listing |
| D3 | Apply the `rejected` status migration? | not yet; use Hide | optional |
| D4 | Authorize **Gate C migration** on the hosted project (branch rehearsal first) | yes, after rehearsal | **any onboarding** |
| D5 | Provide Brevo key, verified sender, test mailbox; set `REQUIRE_EMAIL_VERIFICATION=true` | yes | **any onboarding** |
| D6 | Approve an owner-bootstrap procedure for the hosted DB (no approved procedure exists; `seed.js` is production-blocked; runbook forbids seed for recovery) | provision the owner row intentionally, verify its email, then sign in | **any onboarding** |
| D7 | Sync the Windows tree (`C:\Users\hp\Desktop\kayad-fresh`) with this package (never wholesale-overwrite; remove stray `tatus --short` file) | yes, via diff review | before deploying |
| D8 | Hash recipient addresses in provider retry logs | yes (low) | optional |
| D9 | Review remaining dealer-dashboard queries that use non-existent raw columns (see risk register R7) | schedule | before dealers rely on dashboards |
