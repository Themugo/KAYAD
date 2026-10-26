# KAYAD Phase 13K — Field Allowlist and API Contract

Implementation: `backend/utils/publicVehicleProjection.js` (`toPublicVehicleDetail`, `toPublicVehicleSummary`, `toPublicDealer`; policy switches `exposeVin:false`, `exposeSellerPhone:false`).

## Public vehicle detail (`GET /api/cars/:id`, `/api/v1/cars/:id`) — everyone except the listing owner and staff
Allowed (camelCase and legacy snake_case aliases kept for compatibility): id, _id, slug, title, brand, model, year, price, mileage, fuel, transmission, bodyType, color, engine, driveType/drivetrain, condition, description, features, images, coverImage, city/location_city, status, views, inspectionStatus, dutyStatus, isVerifiedDealer, isPromoted, dealRating, auctionStatus, auctionEnd, auctionStartTime, startingBid, currentBid, bidsCount, allowBid, allowBuy, hasAuction/isAuction, createdAt, updatedAt, escrowEnabled, sold, dealer.
`dealer` (object): id, _id, name, businessName/business_name, avatar, role, dealerApprovedAt, dealerRating. An unpopulated dealer id string is passed through (already the seller id used for chat/showroom links).

## Decisions per field
| Field | Decision | Reason |
|---|---|---|
| reservePrice / reserveMode | removed | not consumed by public UI; reserve rules are bidding-domain |
| dealerPhone (listing column) | removed | not consumed anywhere in the SPA |
| seller account phone (`dealer.phone`) | removed (owner decision) | fed only "Call Seller"; chat remains |
| seller email, bio, location (dealer populate) | removed | not consumed by the detail flow; bio remains public on the dealer-profile endpoint by design |
| chassisNumber, registrationNumber | removed | not consumed |
| VIN | removed (owner decision) | UI guards added: VIN row, copy button, price-alert VIN line, Vehicle-Identity badge render only when a VIN is present |
| highestBidder(Id), winner, paymentStatus, isPaid | removed | bidding/payment state |
| priceHistory, trustScore, ntsaVerified, logbookVerified, favoritesCount, clicks, reminder*, extensionCount, promotionExpiresAt | removed | internal; not consumed by detail (`ntsaVerified`/`trustScore` remain on the list projection, unchanged) |
| deletedAt/deletedBy, isFlaggedDuplicate, approved | removed | internal moderation state |
| top-level `dealer_id` | removed | duplicate of `dealer.id`, which the mapper already falls back to |
| seller id (`dealer.id`) | kept | required for chat and showroom; also the public dealer-profile key |

Owner and staff (`isOwner` / `STAFF_ROLES`) keep the existing full record; nothing in the owner/admin contract changed. Non-public listings (hidden/pending/draft/deleted/rejected) still return 404 to everyone else (existing rule, unchanged).

## Public search (`GET /api/search`)
`data[]` is projected with `toPublicVehicleSummary` = the list-card contract (id, slug, status, title, price, images, coverImage, brand, year, model, city, fuel, transmission, mileage, bodyType, color, condition, description, bid/auction display fields, views, trustScore, dealRating, createdAt, dealer (public form), isVerifiedDealer, inspectionStatus, ntsaVerified, dutyStatus, isPromoted, escrowEnabled). `pagination` unchanged.

## Public list (`GET /api/cars`)
Projection unchanged; dealer populate no longer selects `phone`.
