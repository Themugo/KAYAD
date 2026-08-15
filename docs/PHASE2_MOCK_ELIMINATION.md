# PHASE2_MOCK_ELIMINATION.md
**KAYAD - Phase 2: Eliminate Mock Business State From Production Workflows**

Given the scope of this phase (12 priority domains, each requiring a real integration with full loading/error/empty/CRUD verification and dedicated tests to be genuinely "connected" rather than superficially touched), this document does two things: (1) completes one real, fully-verified integration end to end, and (2) produces the honest status report for all 12 domains this phase requires - most of which remain open work, named explicitly rather than claimed done.

---

## 1. Completed This Phase: Saved Vehicles (Priority #11)

Why this domain first: of the 12 priorities, saved vehicles had the simplest real backend (favorites table, confirmed real in Phase 1's baseline work), the smallest UI surface (one hook, already isolated in Phase 1's own useVehicleCollections.ts extraction), and no dependency on other unconnected domains. The lowest-risk, most tractable place to demonstrate a complete, real integration rather than spread thin across all 12.

### The full chain, verified end to end
```
UI (VehicleCard/heart icon toggle)
  -> useVehicleCollections.handleToggleSave()
    -> services/favoriteApi.ts (toggleFavorite)
      -> POST /api/favorites/:carId/toggle (credentials: include)
        -> backend/routes/favoriteRoutes.js (router.use(protect) - real auth gate)
          -> controllers/favoriteController.js (toggleFavorite)
            -> Favorite model -> favorites table (real, confirmed Phase 1)
          <- { success, favorited }
        <- optimistic UI reconciled with real server result
```

### What was built
- src/services/favoriteApi.ts - new, typed client (getFavorites, toggleFavorite), following the exact pattern established in authApi.ts/vehicleApi.ts.
- src/hooks/useVehicleCollections.ts - rewired to fetch real favorites on mount for an authenticated user, and to call the real toggle endpoint with optimistic update + rollback on failure.

### A real, permanent behavioral split - not glossed over
The backend's favorite routes are auth-required (router.use(protect), confirmed directly). There is no anonymous-favorites concept on the backend at all. This means:
- Logged in: the real API is authoritative. A fetch/toggle failure is a genuine error, surfaced via a new favoritesError state (not silently swallowed).
- Logged out: local-only state, identical to the pre-Phase-2 behavior. This is not a fallback for failure - it's the correct, permanent behavior for a visitor the backend cannot persist anything for.

### Verified states (per this phase's own required checklist)
| Requirement | Status |
|---|---|
| Loading | isFetchingFavorites tracked accurately |
| Success | Real favorites replace the local default on successful fetch (test: verified) |
| Empty state | An authenticated user with zero real favorites correctly gets an empty savedVehicles array, not the stale local default (test: verified) |
| API failure | Fetch failure surfaces favoritesError, preserves the last-known list rather than wiping it (test: verified) |
| Authentication failure | A 401 is classified distinctly (kind: 'unauthenticated') in the error type, though not yet given distinct UI handling from other server errors - named as a gap, not silently covered |
| Authorization failure | Not independently tested - the backend's protect middleware is the real gate; no role-based authorization exists on this specific endpoint beyond "is authenticated" |
| Pagination | getFavorites accepts page/limit, matching the real endpoint's real support; not exercised by the UI yet (only limit: 50 used, no pagination controls built - out of scope, no existing UI pagination control to connect) |
| Filtering/sorting | Not applicable - the real endpoint has none for this resource |
| Refresh | Re-fetches on userId change (covers login/logout mid-session), not on a manual refresh action (no such control exists in the UI to connect to) |
| Stale data | Explicitly handled: a toggle's real server response reconciles against the optimistic guess rather than trusting it blindly, protecting against drift from a concurrent action elsewhere |
| Retry | Not built - a failed toggle rolls back and surfaces an error, but no automatic or user-triggered retry exists |

### Test coverage
9 tests total in useVehicleCollections.test.ts (4 pre-existing local-state tests, unchanged and still passing - confirming the anonymous path has zero regression; 5 new tests for the authenticated path: real fetch on mount, no-fetch-when-anonymous, real toggle request shape, rollback-on-failure, and preserved-state-on-fetch-failure).

### Known limitation, not fixed this phase
addFavorite/removeFavorite/toggleFavorite on the backend all use the same fake-transaction layer (utils/supabaseSession.js) already documented as providing no real atomicity (PHASE8.md). Not this integration's concern to fix - noted here since it's directly relevant to this specific connected workflow's real robustness, not a new finding.

---

## 1a. Continued This Session: Vehicle Detail Fallback Fetch (Priority #1, Partial Progress)

Per this document's own §3 recommendation ("Vehicles - finish connecting detail/auction views, since the client already exists - is the most tractable next step"), picked up directly: App.tsx's vehicle-detail-opening logic only ever searched the already-loaded 50-item vehicles list; a vehicle ID outside that set (e.g. a direct/shared link) went straight to an "invalid vehicle" state even if the vehicle genuinely exists in the backend. Now falls back to a real getCarById() fetch (built and tested since Fusion Phase 4/5/6, previously never called by any UI component) before concluding a vehicle ID is actually invalid.

A real duplication found and fixed while doing this, not just the single fix originally planned: this "find locally or mark invalid" logic existed in two separate places - handleOpenVehicleDetails (the click-driven path) and a second, independent copy inside the mount/popstate URL-sync effect (the path that actually matters most for shared/bookmarked links, since that's what runs on page load). Fixing only the first would have left the more important case - a user opening a shared link - still broken. Both were fixed, with a shared latestRequestedVehicleId ref providing consistent race protection across both async fallback paths (so a rapid double-navigation can't let a stale response overwrite a newer one).

This does not move "Vehicles" from PARTIAL to CONNECTED - the auction/creation/editing flows remain on mock data entirely, and this is one specific gap closed within the "vehicle list/detail" slice of the domain, not the whole domain. Still PARTIAL, now with a narrower, more accurately-described remaining gap.

New test coverage: 1 new test in App.test.jsx, verifying (via a mocked fetch and a simulated ?vehicleId= URL param) that the real GET /api/cars/:id request is genuinely attempted for an unrecognized ID - not just that the app doesn't crash.

---

## 2. Full 12-Domain Status Report


| # | Domain | Status | Basis |
|---|---|---|---|
| 1 | Vehicles | PARTIAL | Real vehicleApi.ts client exists, tested. List view wired into App.tsx with honest fallback (Fusion Phase 7). Detail view now also falls back to a real per-vehicle fetch for IDs outside the loaded list (this session's continuation - see section 1a). Auction/creation/editing flows still read INITIAL_VEHICLES mock data directly - a partial slice of the domain, not the whole thing, is connected |
| 2 | Dealers | MOCK | MOCK_DEALERS still the only data source. **Investigated this session**: no public "list all dealers" API exists anywhere in the backend - dealerRoutes.js is entirely dealer-own-dashboard (auth-gated to the dealer themselves), dealerPlatformRoutes.js only has a single-dealer-by-ID public lookup. Not a frontend-connection gap; a genuine backend capability that doesn't exist yet |
| 3 | Sellers | MOCK | Shares /api/cars create/update on the backend with dealers (confirmed), but the private-seller frontend flow is entirely mock-driven |
| 4 | Users | CONNECTED | Genuinely complete: real registration/login/session-restoration, backend-authoritative, tested end to end (Fusion Phase 3) |
| 5 | Auctions | MOCK | INITIAL_AUCTION_SESSIONS mock data still the UI's only source. Real, sophisticated backend exists (Redis-backed engine, denormalized-on-cars auction state per Phase 5's correction) but no frontend client exists for it yet |
| 6 | Bids | MOCK | Same situation as auctions - real bids table and race-condition-hardened backend (Phase 8), zero frontend connection |
| 7 | Escrow | MOCK (UI) / SPLIT (backend) | UI entirely mock (MOCK_ESCROW_DEALS). Backend itself has the unresolved two-system split documented in Phase 8 (escrows real, escrow_vaults has no table) - connecting the frontend to this domain should wait until that product decision is made, not attempted blind against an ambiguous backend target |
| 8 | Inspections | MOCK | No frontend client exists; backend inspection_orders/inspection_packages real but base Inspection/Inspector models lack tables (Phase 0 baseline) |
| 9 | Payments | MOCK-ADJACENT | No frontend UI exists for payments at all (confirmed in every prior phase) - "mock" doesn't quite apply since there's no frontend payment flow to be mock or real; the backend is real and sophisticated (Phase 6/7/8) |
| 10 | Chat | MOCK | **Investigated this session, no longer UNKNOWN**: the backend chat system is real and solid (chats table, participants + embedded JSONB messages, protected routes, per-chat authorization). The blocker is specific and structural: the frontend's own ChatMessage type (src/types.ts) has no chat/conversation/participant concept at all (a flat `{sender: 'user'|'seller', text}` model) - connecting it properly requires a frontend data-model change, which crosses into "redesign screens," outside this phase's scope. A second, unused ChatMessage definition also exists in types/index.ts - the same class of duplicate-type issue Phase 1 fixed for UserProfile, not yet cleaned up |
| 11 | Saved vehicles | CONNECTED | Completed this phase - see section 1 |
| 12 | Admin records | MOCK | Frontend admin panel is entirely localStorage-backed (Phase 0 baseline's single largest "looks complete, isn't connected" finding); real 64-endpoint /api/admin surface exists, unconnected |

Summary count: 2 of 12 CONNECTED (Users, Saved vehicles), 1 PARTIAL (Vehicles), 8 MOCK (Dealers, Sellers, Auctions, Bids, Inspections, Chat, Admin records, plus - see below), 1 SPLIT/blocked-on-a-decision (Escrow), 1 MOCK-ADJACENT (Payments, no UI to begin with). No domains remain UNKNOWN as of this session - Chat was investigated and reclassified from UNKNOWN to MOCK with a specific, understood reason, and Dealers' MOCK classification was confirmed with a specific, understood reason (no backend API exists) rather than left as an unexamined assumption.

---

## 1b. Investigated This Session: Dealers (Priority #2) and Chat (Priority #10) - Real Findings, Neither Connected

Continuing this document's own §3 recommendation, both of the next-named priorities were investigated in full before writing any integration code. Neither was connected - not because the work was skipped, but because each investigation surfaced a real, concrete reason connecting it now would violate this phase's own explicit rules, rather than a reason to force it anyway.

### Dealers: no public listing API exists at all
`DealersView` (the component `MOCK_DEALERS` feeds) needs a *list* of dealers to browse - confirmed by reading its own props interface (`dealers: Dealer[]`). Checked every dealer-related route file for a matching endpoint:
- `backend/routes/dealerRoutes.js`: `router.use(protect, dealerOnly, requireApproved)` on the entire file - this is a dealer's own private dashboard API (earnings, inventory, leads), not a public directory. A logged-in dealer can query their own data; nothing here lets a buyer browse dealers.
- `backend/routes/dealerPlatformRoutes.js`: has one public (no `protect`) route, `GET /profile/:dealerId` - but this returns a *single* dealer by ID, not a list.
- Searched broadly across every other controller for any dealer-listing logic: found only internal dealer-ID lookups used for filtering cars (`carController.js`) and admin-only aggregate stats (`operationsController.js`), neither of which is a public "browse all dealers" capability.

**Conclusion: there is no existing API to connect to for this specific need.** Per this phase's own explicit rules ("do not create replacement backend systems if an existing API already exists" implies the inverse too - do not invent a new one where none exists, since that would be "add new features," also explicitly prohibited), this is correctly left MOCK, not forced into a false "connected" state via new backend work this phase isn't authorized to do. Building a real dealer-directory endpoint is a legitimate future task, but it's backend feature work, not a frontend-connection task this phase can complete.

### Chat: the backend is real and working; the frontend's own data model is incompatible with it
The backend chat system is genuinely solid: `chats` table (participants array, `messages` embedded as JSONB - confirmed directly against the real schema, correcting an imprecision in this program's own earlier baseline reports that implied a separate `messages` table exists; there isn't one, by design, and the design is reasonable) with real, protected routes (`startChat`, `getUserChats`, `getMessages`, send-message, mark-seen), proper per-chat authorization checks, and sender enrichment.

**The blocker is the frontend's own `ChatMessage` type**, and it surfaced a real, previously-unfound duplicate-type problem of the same kind Phase 1 fixed for `UserProfile`: two incompatible `ChatMessage` definitions exist -
- `src/types.ts` (the one `App.tsx`/`ChatView` actually use): `{ id, sender: 'user' | 'seller', text, timestamp, vehicleTitle? }` - a flat, single-conversation model with no chat/participant concept at all.
- `src/types/index.ts` (unused by the real chat UI): `{ id, senderId, receiverId, vehicleId?, text, sentAt, offerAmount? }` - closer to the backend's real shape, but still not used anywhere.

The frontend's actual, in-use chat data model has no concept of "which conversation" or "which other participant" - it's a single flat list. The backend's real model is "many chats, each between two real participants, each with embedded messages." Building a real API client is not the hard part here (the pattern is identical to `authApi.ts`/`favoriteApi.ts`); the hard part is that using it correctly would require the frontend to gain a chat/conversation concept it currently doesn't have - a genuine data-model and UI restructuring, not a drop-in API swap. That crosses into "redesign screens," which this phase explicitly prohibits.

**Conclusion: correctly left MOCK, with the actual blocker identified precisely** (not "chat is hard," but specifically "the frontend's ChatMessage type has no conversation concept to attach real chat data to") - status upgraded from this document's prior "UNKNOWN, not yet investigated" to a specific, well-understood reason it remains MOCK. The duplicate `ChatMessage` type itself (unused copy in `types/index.ts`) is a smaller, safe cleanup candidate on its own, separate from the larger chat-integration question - not fixed this session, flagged for a future Phase-1-style cleanup pass.

---



## 3. Why Only One New Domain Was Completed This Phase

This phase's own requirements for a domain to count as genuinely integrated are substantial: real API client, real UI wiring, loading/success/empty/failure/auth states, and dedicated tests - not a single successful data load. Doing this properly for even one domain (saved vehicles) required a new API client, a hook rewrite, an optimistic-update-with-rollback pattern, and 5 new tests. Attempting all 12 domains to this same standard in one pass would mean either doing all of them superficially (violating this phase's own explicit "not integrated merely because it displays API data once" standard) or one of them properly - the latter was chosen as the honest, defensible path.

Recommended order for continuing this phase, based on real backend readiness confirmed across this program's prior work: Vehicles (finish connecting detail/auction views, since the client already exists) is the most tractable next step, followed by Dealers/Sellers (real backend, no client yet). Escrow should wait until Phase 8's system-split decision is made. Chat needs an investigation pass before any connection work, since its current status is genuinely unknown, not just unconnected.

---

## 4. Verification Run This Phase

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend test suite | 191/191 passing (185 pre-existing + 5 saved-vehicles + 1 vehicle-detail-fallback) |
| Lint | Clean |
| Production build | Succeeds |
| Backend | Not modified this phase |

---

## 5. What This Phase Deliberately Did Not Do

- Did not connect Dealers, Sellers, Auctions, Bids, Inspections, or Admin records - named as open work above, not silently claimed complete.
- Did not connect Escrow - deliberately deferred pending the Phase 8 system-split decision, since building a new frontend integration against a backend with an unresolved architectural question would risk connecting to the wrong (or a soon-to-be-deprecated) system.
- Did not investigate Chat's real status - flagged as genuinely unknown rather than guessed at, since guessing "mock" or "connected" without checking would be worse than an honest "not yet assessed."
- Did not build pagination/retry UI for saved vehicles, even though the backend supports pagination - no existing UI control to connect it to, and building new UI controls is outside this phase's "connect existing systems, don't add features" scope.
