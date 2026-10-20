# Stage 5F.5 API Verification Matrix

| Dashboard data | Existing client function | API contract evidence | Scope and display rule | Verification status |
|---|---|---|---|---|
| Seller listings | `getMyListings()` in `src/services/vehicleApi.ts` | `GET /api/cars/my-listings`, documented as the signed-in seller's own listings across statuses | Listing counts/statuses/views derive from returned rows. Failure renders unavailable/error, not a false empty state. | Source traced; live API untested |
| Escrow/deals | `getMyEscrows()` in `src/services/escrowApi.ts` | `GET /api/escrow/my`, documented as deals involving the authenticated user as participant | Labelled account-linked deals because response may include buyer or seller participation. Failure handled independently. | Source traced; live API untested |
| Buyer inquiry count | No authoritative seller inquiry endpoint verified in this stage | Not established from the reviewed seller listing contract | Not displayed; do not invent an inquiry total. | Not implemented; API evidence required |
| Seller analytics/trends | No seller-specific analytics contract verified for this active component | Listing `views` is available; time-series analytics not established | No fabricated trend percentages or charts. | Not implemented; API evidence required |
| Revenue | No seller revenue summary contract verified for this component | Escrow participant summary exists but is not equivalent to realized seller revenue | No revenue total displayed. | Not implemented; financial source required |
| Verification | Existing Trust Center section | Full identity/verification API contract was not changed in this stage | Dashboard links to existing Trust Center; does not infer verified state. | Existing workflow retained; browser test pending |

No live requests were made and no API or database was mutated during this stage.
