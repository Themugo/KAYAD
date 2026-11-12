# Unified personal account: confirmation of one identity, buyer + seller functions

**Date:** 11 November 2026. **Evidence tier:** local automated tests and source review. Not browser-tested signed in, and not tested against a live database.

## Verdict

**Confirmed for the backend rules, with 3 real defects found and fixed during this check, and 2 minor residuals documented.**
A personal account (`users.role = 'user'`) now holds every buyer function and every private-seller function. There is no separate seller identity: new accounts can only be `user` or `dealer` (`individual_seller` retired, see report 01). Dealers remain a separate, verified account type by design.

## What I found while verifying (not assumed)

Retiring the role was not enough on its own. Several seller-side checks still named only the legacy role, which would have left a personal account that sells **worse off than a legacy seller**:

| # | Defect found | Effect on a personal account that sells | Fix |
|---|---|---|---|
| 1 | Escrow eligibility listed only `individual_seller` and `dealer` (`escrowCapability.service.js`, `escrowConfiguration.service.js`) | Escrow could never be enabled on its vehicles, and staff could not grant the capability (HTTP 400) | `user` added to the eligible roles. Escrow still needs an explicit staff-granted capability, so eligibility alone grants nothing |
| 2 | Phone step-up (password required to change the payout phone number) covered only dealers and `individual_seller` | A personal account receiving payouts had **no** protection against a session holder redirecting money | `user` added in the API and in the Profile screen together (changing only the API would have blocked phone changes) |
| 3 | Vehicle passport creation allowed only dealers, legacy sellers and staff | Personal-account owners could not create a passport for their own vehicle | `user` allowed; ownership is still enforced inside the service for every non-staff caller |

## Capability matrix (one `user` account)

| Function | Available to a personal account? | Gate | Evidence |
|---|---|---|---|
| Browse, search, save favourites | Yes | signed-in only | route guards scanned: no role split (new test) |
| Make and negotiate offers, enquiries (leads) | Yes | signed-in only | same |
| Chat | Yes | signed-in only | same |
| Pay via escrow as buyer | Yes | signed-in only | same; escrow directory 12 suites pass |
| Bid in auctions | Yes | signed-in only | auction suite 12 files pass |
| Create / edit / delete own listings | Yes | `sellerListingAccess` driven by the onboarding policy (free by default; verified email; suspension/revocation enforced) | `phase13eSellerCapability` (listing access, auto-publish, unverified, suspended, package mode) |
| Receive offers and sell | Yes | same | offer workflow tests |
| Escrow on own vehicles (seller side) | **Yes (fixed)** | staff-granted capability + admin escrow rules | `unifiedPersonalAccountParity`, `escrowCapability.service` (grant to `user` succeeds; staff roles rejected) |
| Private-seller auction proposals | Yes | signed-in only | route guards |
| Vehicle passport / ownership | **Yes (fixed)** | ownership check in service | parity test |
| Payout-phone change protection | **Yes (fixed)** | password step-up | `accountSecurityPaymentReadiness`, parity test |
| Dashboard: listings, buying activity, transactions, one navigation | Yes | same account | frontend tests; counters use real endpoints |
| Dealer inventory, dealer routes | **No (intended)** | dealer verification | dealer isolation 174/174 |
| Staff / admin functions | No (intended) | staff roles | rbac suites |

## Residuals (not blocking the unification)

1. **Announcements to "sellers"** (`announcementController.js`) target dealers and legacy `individual_seller` rows only, so a personal account that sells is not in that audience. Needs an agreed definition (for example "has an active listing") before changing.
2. **Chat label:** a personal account shows as "Marketplace member"; only legacy rows show "Private seller". This is consistent with one identity and is cosmetic.

Plus the standing items: legacy `individual_seller` rows are untouched (G-20), the signed-in dashboard has not been exercised in a real browser, and nothing was tested against the live Supabase project.

---

## Addendum (11 Nov 2026, evening): "buyer" retired as an account type; dealer protection

**Decision applied:** there is no buyer account, role, dashboard or label. Every personal account has buying and private selling together. A dealer is a separate account type.

### What "buyer" meant and what changed
| Where | Before | Now |
|---|---|---|
| Frontend role id | `mapBackendRoleToFrontend('user')` returned `'buyer'`; types had `'buyer'` | Returns `'user'` (a legacy `'buyer'` string maps to `'user'`); types use `'user'` |
| Dashboard hub | Plain users saw "Buyer Dashboard"; legacy sellers saw "My Dashboard" | **One** "My Dashboard" for every personal account; the seller-workspace entry follows the real capability state |
| Navbar | "Buyer Command Center", "Private Seller / Buyer", "Private Seller Dashboard" | "My Account", "Personal account", "Selling Workspace" |
| Buying workspace headings | "Buyer command centre", "Buyer activity summary" | "My account", "Buying activity summary" |
| API capabilities | separate `buyer` and `privateSeller` entries | canonical `personal { buying, selling }`; `buyer`/`privateSeller` kept only as flagged deprecated aliases |
| Backend gates | `buyerOnly` (role user only) and `privateSellerOnly` (legacy role only), unused | Removed; a guard test fails if reintroduced |

Kept on purpose: deal participants (the buyer and seller **of a transaction**, escrow `viewerRole`, `buyerName`) are transaction terms, not account types. Internal URL/section ids such as `buyer-platform` and `buyer-escrow-workspace` are unchanged so links and tests keep working.

### Dealer protection (verified, not assumed)
- Dealer-business routes admit only a verified-email dealer and staff; `user` and legacy `individual_seller` get 403 (new test + existing isolation suite 174/174).
- A dealer cannot be addressed through another dealer's id; personal accounts cannot either.
- Self-registration as dealer always creates a dealer (pending verification); it is never mapped into the personal account.
- A dealer is never reported as a personal account in the capabilities API.
- The navbar offers personal accounts no in-place dealer upgrade. That branch was dead code (it tested a frontend role that was never set); I removed it and did **not** switch it on.

### One open decision (G-22) about dealer separation
The backend still lets an active personal account **start a dealer application on the same account** (`POST /api/dealer/application` and `/onboarding` allow roles `dealer` and `user`; the capabilities API reports `dealer.canApply`). On approval the role would change from `user` to `dealer`, and the personal buying/selling functions of that account would end. Since you describe a dealer as a separate account, I recommend closing it: dealers register through the dealer registration only, and a person who wants both uses two accounts with different emails. This changes a business rule and several existing dealer-application tests, so I have **not** done it. Say "close it" and I will.
