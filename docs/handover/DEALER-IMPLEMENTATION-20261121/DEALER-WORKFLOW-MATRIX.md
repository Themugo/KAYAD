# Dealer workflow matrix (after implementation)

| Workflow | State | Evidence |
|---|---|---|
| Register dealer → pending → approved | Unchanged | journey legacy-j10, 09 setup |
| Create listing (image required) | Unchanged; now receives a permanent listing number | journey 09 |
| Edit listing / photos (cover, reorder, remove) | Works for non-sold; sold refused (409) | journeys 09; photo **upload** against real Cloudinary BLOCKED (local stub only) |
| Pause / publish | Backend + bulk API: atomic, audited. Dealer UI button: NOT added | journey 09; OPEN-ISSUES D-3 |
| Mark sold (single) | Atomic, locks enforced, sale record, `sold_at` | journey 09 |
| Mark sold (bulk) | Itemised, per-id reason codes, duplicates collapsed | journey 09 |
| Accept bid / auction close | Unchanged (auction flow owns that sale) | not re-tested here |
| Offers → settlement → pay | Unchanged; guarded against owner-sold listings | journey 05 (passes after guard narrowing) |
| Escrow fund / release | Unchanged; cannot be opened on an owner-sold listing | journey 09 |
| Customers (= released-escrow deals) | Definition retained, no change | audit D |
| Banking save / read / re-login | Fixed | journey 10 |
| Team invite / accept / roles | Unchanged | journey 10 (invite + accept for all five roles) |
| Inspections, auctions, marketing, finance applications | Not changed; audited earlier | DEALER-ACCOUNT-WORKFLOW-MATRIX.md |
