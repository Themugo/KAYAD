# 05 — Banking duplication and consolidation report

## What exists (verified by reading code on a652701)
| Scope | UI | API | Storage | Notes |
|---|---|---|---|---|
| Dealer business banking | `dashboard/DealerBankingPanel.tsx` (section "Banking"), plus `DealerCollectionAccountPanel` (a *different* thing: the collection / funding account) | `GET/PUT /api/dealer/settlement` (owner-only) | `dealers.payment_details` jsonb (`bankName, accountName, accountNumber, paybillNumber, mpesaPhone, mpesaBusinessName`) | masked read view; audit-logged; single store |
| Dealer Settings → "Banking" tab | `DealerSettingsPanel.tsx` | none | none | **only a link** ("Open Banking") to the Banking section — no second form |
| Personal account | **no payout banking UI**; `users/bank-pre-approval` is *buyer financing* (loan pre-approval), unrelated | `/users/bank-pre-approval` | `users.bankPreApproval.*` | different purpose, correctly separate |
| Admin | platform settlement / bank-transfer settings, escrow accounts (`/api/admin/escrow/accounts`, `settings.bank.reconciliationEmail`) | admin settings routes | `system_settings` | platform money, not user payout details; secrets/accounts logged as "changed" only |
| Legacy dealer UI | `DealerDashboard.jsx` / `DealerHub` still mention payout wording | — | — | legacy shell, not the destination |

## Result
There is **one** dealer banking destination and **one** read/write path; the Settings tab is a pointer, not a duplicate. Personal and business details are in different tables and never merged. Admin finance is separate platform configuration. No competing implementation was found, so **no code was consolidated or removed** (inventing a merge here would couple personal and business data, which the brief forbids).

## Previously reported defect (details save, read back blank)
Fixed in #261 (dealer cache keys invalidated on PUT; read masked view). Re-verified this phase by the DB journey `10_dealer_banking` (save → read back → fresh session read) in the final harness run: **PASS** (harness overall=PASS). Full account numbers are not returned (masked tail only).

## Findings that need an owner decision
* **D-18 — payout destination.** `escrowOperationsController` pays seller payouts by M-Pesa B2C to **`users.phone`** ("Seller payout phone number is not configured"). The dealer's saved settlement details (`paybillNumber`, `mpesaPhone`, bank account) are used for onboarding readiness but **not** by that payout call. A dealer can therefore save a payout M-Pesa number and see "saved" while payouts go to the profile phone. I did **not** change a money path. Decide which field is authoritative; then the payout call must read it server-side (never from the browser).
* **D-19 — personal sellers' payout details.** Personal sellers have no payout-details screen; escrow would use their profile phone. Decide whether a personal payout destination is wanted (separate record, personal scope).
* **Payout history / eligibility view**: not present in the Banking panel (escrow payout rows live in escrow/finance sections). NOT merged; listed as a gap against the brief's "payout history / eligibility".
* Banking audit trail: settlement saves are audit-logged (action recorded, values masked) — VERIFIED in code; an admin-facing audit view is the existing Security Log (now working through the audit_logs fallback after this phase's fix).
