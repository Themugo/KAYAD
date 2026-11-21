# Banking repair (DA-04)

Trace: UI `DealerBankingPanel` → `PUT /api/dealer/settlement` → `dealers.payment_details` (jsonb, keyed by the dealer's user id) → `GET /api/dealer/settlement` (owner-only router: `protect` + `dealerOnly` + workspace status; staff roles are refused).
Persistence was always correct (the DB row held the new value). The defect was the read: `cacheDealerData` stored the first GET for 5 minutes under `dealer:<userId>:/settlement:{}` and `invalidateCache("dealer")` never removed it because Redis `SCAN MATCH dealer` matches only the literal key `dealer`.
Fix: (1) bare cache prefixes now mean `prefix:*` (this also repairs `user` and the other 13 dealer routes that used the same call); (2) banking GET is not cached and returns `Cache-Control: private, no-store`; (3) PUT returns the stored row; (4) response adds `bankAccountMasked`, `mpesaBusinessMasked`, `configured`; (5) the panel re-reads after saving and shows a masked "Saved payout details" summary; (6) audit logs record field names only.
No fake balances were added; the panel shows only what is stored.
Not changed: the account number is still returned unmasked to the authenticated owner for editing (owner-only, no-store). Masking at rest is a separate owner decision.
