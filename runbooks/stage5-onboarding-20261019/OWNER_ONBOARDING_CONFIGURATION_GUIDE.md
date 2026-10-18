# Owner guide — controlling onboarding without editing code

**Where:** Admin → Settings → **🚪 Onboarding**. **Who can change:** the platform owner only (the account whose email is in `WEBHOIST_EMAIL`/`WEBHOIST_EMAILS`, and whose email address is **verified**). Admins and superadmins can *view* the page read-only. Nobody else can see or change it.

## The five settings
| Setting | Values | Launch value if you save nothing | What it does |
|---|---|---|---|
| Private seller registration | `enabled` / `disabled` | **enabled** | Whether individuals can create a private-seller account. |
| Dealer onboarding | `self_onboarding` / `approval_required` / `closed` | **approval_required** | `self_onboarding`: a dealer registers without an invitation and may list up to 3 vehicles while *unverified and pending* (no verified badge, never unrestricted publication). `approval_required`: the dealer registers and applies, gets an acknowledgement, and **cannot list at all** until you approve. `closed`: no new dealer registrations. |
| Listing moderation | `hold_for_review` / `auto_publish` | **hold_for_review** | `hold_for_review`: every new listing is `pending` until a decider approves it. `auto_publish`: a listing from a seller whose *account* is approved goes live immediately; from an unapproved seller it stays `pending`. |
| Who decides dealers/sellers | `owner_only` / `admins` | **owner_only** | Who may approve/reject/reinstate dealer and seller applications. Applies to all three approval endpoints. |
| Who decides listings | `owner_only` / `admins` | **owner_only** | Who may approve/reject listings (single and bulk). |
| Email verification for sellers | fixed | **always on** | Cannot be switched off. A seller or dealer with an unverified email cannot use seller features, whatever the email-provider configuration. |

## What you see and what a save does
1. The page shows the values the **server** holds, a revision number, a source line and the last-changed time. Source lines: *launch defaults* (nothing saved yet), *saved settings*, *damaged* (restrictive values in force until you save), *could not be read* (restrictive values in force).
2. Change one or more selects and press **Save**. The server validates every value, checks the revision you loaded, writes, records an audit entry (who, old value, new value, time, outcome — never secrets) and answers. The page shows the **server's** answer.
3. If someone else changed the settings first you get a **conflict** message and the latest values — review, then save again.
4. If the save fails nothing changed: you see "Not saved … Nothing was changed".
5. Changes reach new requests immediately on the instance that handled the save, and within about 5 seconds on any other instance. No redeploy.

## Fail-safe behaviour (tested)
| Situation | Behaviour |
|---|---|
| No row saved | Launch defaults above. **Dealers are not opened.** |
| Database read fails | Seller and dealer registration refuse with 503; listings are held; only the owner can decide. |
| Stored value damaged | Each damaged field falls back to its most restrictive value; the page says so; the next owner save repairs it. |
| Email provider down/unconfigured | Registration still succeeds (account + hashed token are committed), the verification email may not arrive, the user can use *Resend*. Seller features stay locked until verified. Nothing is ever marked verified or delivered because of a failure. |

## First-time setup (recommended order)
1. Confirm `WEBHOIST_EMAIL` is set in the backend environment and that **the owner account exists and its email is verified** (Launch checklist step 4). Log in as the owner.
2. Open Settings → Onboarding. Confirm the page says *launch defaults*; read the five values aloud against this guide.
3. **Decide and save deliberately** the initial configuration. Suggested for the first private seller and first dealer: private sellers `enabled`; dealers `approval_required`; moderation `hold_for_review`; both authorities `owner_only`. Press Save so the choice is recorded in the audit log rather than relying on defaults.
4. Reload and confirm revision 1, source *saved settings*.

## Changing the mode later (examples)
- Open self-onboarding for dealers: Dealer onboarding → `self_onboarding` → Save. Existing pending dealers immediately gain the limited (3-listing) access; approved dealers are unaffected.
- Close all new registrations quickly: set Private seller registration `disabled` and Dealer onboarding `closed`.
- Delegate day-to-day decisions: set the authority selects to `admins`. Staff roles other than admin/superadmin can never decide.

## Removed control
The old "Require Dealer Approval" toggle in General was dead (stored but never read). It has been removed; the General tab points to this page. The stored field remains accepted by the API for compatibility and has no effect.
