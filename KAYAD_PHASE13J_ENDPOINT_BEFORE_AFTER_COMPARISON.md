# KAYAD Phase 13J — Before/After Endpoint Response Comparison (synthetic data)

`GET /api/auctions/:id/registration` as an ordinary signed-in buyer. Synthetic listing with reserve price, dealer phone, chassis number, VIN, highest-bidder id, payout destination, fulfilment location and readiness snapshot populated. Raw data: `validation-logs/phase13j/endpoint_before_after_synthetic.json`.

| Case | HTTP | `car` fields | `setup` keys | Sensitive synthetic values present in body |
|---|---|---|---|---|
| BEFORE (13I, vulnerable) · available | 200 | 110 | 21 | reservePrice9876543, dealerPhone, chassisNumber, vin, highestBidderOrSellerId, payoutDestination, fulfilmentLocation, readinessSnapshot |
| BEFORE (13I, vulnerable) · hidden | 200 | 110 | 21 | reservePrice9876543, dealerPhone, chassisNumber, vin, highestBidderOrSellerId, payoutDestination, fulfilmentLocation, readinessSnapshot |
| AFTER (13J, remediated) · available | 200 | 17 | 3 | none |
| AFTER (13J, remediated) · hidden | 404 | 0 | — | none |

## After (available listing)
- `car` fields: allowBid, auctionEnd, auctionStartTime, auctionStatus, bidsCount, brand, coverImage, currentBid, id, images, mileage, model, price, startingBid, status, title, year
- `setup` keys: car_id, config, publication_status
- `setup.config` keys: bidIncrement, commitment, settlement, termsVersion
- Top-level keys: car, registration, setup, success

## Before
The 13I code returned the raw `cars` row (110 fields, camel and snake aliases) **and** the raw `auction_setups` row (21 keys) for hidden/pending/draft/deleted and available listings alike. The `setup` leak was not in the 13I report or the 13I proposed patch.

(The `BEFORE` column was produced by running the unmodified 13I route file in an isolated scratch copy on port 5056 against the same disposable database.)
