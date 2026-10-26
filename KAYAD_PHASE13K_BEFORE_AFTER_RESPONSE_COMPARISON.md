# KAYAD Phase 13K — Before/After Response Comparison (synthetic values)

Anonymous requests; synthetic listing with every sensitive column populated. Raw data: `validation-logs/phase13k/endpoint_before_after_synthetic.json`. (Counts include camelCase + snake_case aliases emitted by the model facade.)

| Endpoint | State | HTTP | Top-level fields | Dealer keys | Sensitive synthetic values present |
|---|---|---|---|---|---|
| `GET /api/cars/:id` | BEFORE (13J, unpatched) | 200 | 110 | 13 | reservePrice, listingDealerPhone, chassisNumber, vin, registrationNumber, highestBidderId, sellerAccountPhone, sellerEmail |
| `GET /api/v1/cars/:id` | BEFORE (13J, unpatched) | 200 | 110 | 13 | reservePrice, listingDealerPhone, chassisNumber, vin, registrationNumber, highestBidderId, sellerAccountPhone, sellerEmail |
| `GET /api/search?q=` | BEFORE (13J, unpatched) | 200 | 110 | — | reservePrice, listingDealerPhone, chassisNumber, vin, registrationNumber, highestBidderId |
| `GET /api/cars?brand=` | BEFORE (13J, unpatched) | 200 | 50 | 10 | sellerAccountPhone |
| `GET /api/cars/:id` | AFTER (13K, patched) | 200 | 62 | 7 | none |
| `GET /api/v1/cars/:id` | AFTER (13K, patched) | 200 | 62 | 7 | none |
| `GET /api/search?q=` | AFTER (13K, patched) | 200 | 52 | — | none |
| `GET /api/cars?brand=` | AFTER (13K, patched) | 200 | 50 | 9 | none |

Before: full `cars` row (110 fields) plus a populated dealer object carrying account email, phone, bio, location, ratings. Search returned raw rows. The list returned the seller account phone.
After: allowlisted fields only (see the contract document); dealer reduced to `id, name, businessName, avatar, role, dealerApprovedAt, dealerRating`.
