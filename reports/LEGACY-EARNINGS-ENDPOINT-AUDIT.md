# Legacy `/earnings` and `/summary` endpoint audit

Scope: `GET /api/dealer/earnings` and `GET /api/dealer/summary` (`backend/routes/dealerRoutes.js`, owner-only behind `dealerOnly`). Evidence: static search of the repository plus executed behaviour in `ci/db-journeys/19_dealer_ledger_reconciliation.mjs` (real payment, release, payout and refund flows on the disposable database).

## Correction to the earlier hypothesis
The task statement and revision 1 of the definitions said these endpoints "count successful payments that may still be held in escrow". The executed evidence shows something different:

* Both sum `payments.dealer_amount` over payments with `status = 'success'`.
* `dealer_amount` (and `platform_fee`) is written only by the release transaction (`kayad_transition_escrow_atomic`), which in the same statement moves `payments.status` from `success` to `released`.
* So the two conditions never hold together for an escrow sale. For a dealership with 3,532,838.65 KES of released sales the endpoints returned **total = 0** and `totalRevenue = 0`.
* The `payments` list and `count` of `/earnings` still contain payments that are `success` but unreleased: one held escrow payment and one direct-mode payment (count = 2), each with `dealerAmount = 0`.

So held escrow is **not** added to the amount, but the figures are still wrong and misleading: they report 0 for real revenue, and the list presents unreleased payments under the heading "earnings". Neither figure reconciles to the ledger or to the command centre.

## Consumers
| Consumer | Uses | Mounted in the app? |
|---|---|---|
| `src/api/api.exports.ts` `dealerAPI.earnings`, `.summary` | definitions only | n/a |
| `src/pages/dealer/DealerDashboard.jsx` (`dealerAPI.summary()`, label "Total Revenue", "Earnings") | `summary.totalRevenue` | **No.** Imported only by its own unit test (`src/__tests__/pages/dealer/DealerDashboard.test.jsx`); the live overview (`App.tsx`) is `src/pages/dealer/dashboard/DealerDashboard.tsx` |
| `src/pages/dealer/DealerAnalytics.jsx` (`dealerAPI.summary()` + `.earnings({days})`, "Revenue (Nd)", "Revenue Over Time") | `earnings.total`, `earnings.monthly` | **No.** Not imported by any module, test or route |
| `backend/tests/regression/phase13dDealerIsolation.test.js` | response shape and isolation | tests |
| `runbooks/phase14-9-20261026/**/e2e_dealer_payments.cjs`, `runbooks/phase16-20261026/e2e_dealer_payments.cjs` | operational scripts | runbooks |
| `backend/openapi.yaml` | documents the endpoints | documentation |
| Reports | `DEALER-*.md` in this repository only | n/a |

No mounted screen displays these figures today. The risk is latent: an orphaned screen or an external API consumer (none can be ruled out from the repository) would show 0 revenue under a revenue label.

## Names and labels
`earnings`, `totalRevenue`, and the screen labels "Total Revenue" / "Revenue (Nd)" all imply released revenue. They are not released revenue (see above).

## Compatibility decision
Preserve the response structure and the numbers. Do not rewrite the financial APIs. Applied change (additive, no breaking change): both responses now carry a `basis` object (`/earnings`) or `revenueBasis` (`/summary`):

```json
{ "definition": "Sum of payments.dealer_amount over payments with status=success (legacy basis)",
  "isReleasedRevenue": false, "includesHeldEscrow": false, "listIncludesUnreleasedPayments": true,
  "note": "Not released revenue and not reconcilable to the ledger. Use GET /api/dealer-platform/command-centre (financial.releasedRevenue) for released sales revenue." }
```

Verified by journey 19 (the payload is present and the numbers are unchanged).

## Recommendation (needs approval; not applied)
1. Keep the endpoints for compatibility but base `total`/`totalRevenue`/`monthly` on released escrows (`escrows.sellerAmount`, status `released`/`closed`, dated by `releasedAt`), and filter the `payments` list to released payments. That changes reported numbers and is a financial-reporting change.
2. Alternatively mark both endpoints deprecated and remove the two orphaned `.jsx` screens after dependency analysis.
3. Update `openapi.yaml` with the new fields.

## Held escrow cannot be shown as revenue anywhere in the product
The command centre's definitions (released/closed only), the legacy endpoints (amount 0 for unreleased payments), and the legacy overview (`released` escrows) were each checked; no screen presents held escrow as earned or released revenue.
