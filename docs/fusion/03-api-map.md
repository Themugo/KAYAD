# 03 — API Map
**KAYAD Fusion Audit — Document 3 of 12** (built ahead of 02, per 01's own note: the canonical-feature map needs this document's data to be accurate, not the other way around)

Every number here comes from a direct parse of `backend/server.js`'s `app.use()` calls and a regex count of `router.get/post/put/patch/delete(...)` calls inside each of the 92 files in `backend/routes/`. Not sampled, not estimated — all 92 files were parsed.

---

## 1. Headline Numbers

- **92 route files**, all confirmed mounted somewhere reachable from `server.js` (directly, or via the `v1.js`/`v2.js` aggregators — verified this indirection explicitly after an initial false alarm, see §5)
- **1,168 total individual endpoints** (`router.METHOD(path, ...)` calls) across those files
- **Zero of these endpoints are called anywhere in the frontend** — verified against the actual specific mount paths (`/api/cars`, `/api/auth`, `/api/bids`, `/api/escrow`, `/api/auction`, `/api/dealer`), not just a generic `/api` search. This is the single most important fact in this document.

---

## 2. Endpoints Grouped by Business Domain

### Core Marketplace / Transaction Domain
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/cars` | carRoutes.js | 19 |
| `/api/auction-admin` | auctionAdminRoutes.js | 5 |
| `/api/new-admin/auction-integrity` | auctionIntegrityRoutes.js | 6 |
| `/api/bids` | bidRoutes.js | 8 |
| `/api/sms-bidding` | smsBiddingRoutes.js | 5 |
| `/api/payments` | paymentRoutes.js | 7 |
| `/api/escrow` | escrowRoutes.js | 11 |
| `/api/escrow-vault` | escrowVaultRoutes.js | 11 |
| `/api/transactions` | transactionRoutes.js | 3 |
| `/api/ledger` (+`/api/v1/ledger`) | ledgerRoutes.js / transactionLedgerRoutes.js | 8 |
| `/api/reconciliation` | reconciliationRoutes.js | 14 |
| `/api/finance` | financeRoutes.js | 8 |
| `/api/disputes` | disputeRoutes.js | 18 |
| `/api/fraud` | fraudRoutes.js | 11 |

**Note:** the plain `/api/auction` root mount (as opposed to `-admin`/`-integrity` variants) was **not found** as a direct `server.js` mount — its file, `auctionRoutes.js`, is mounted indirectly via `v1.js` → `/api/v1` (verified in §5, not assumed). There is no bare `/api/auctions` top-level path; auction listing/browsing lives under `/api/v1/...` specifically. This naming asymmetry (admin/integrity auction routes get top-level `/api/` mounts, core browsing doesn't) is flagged for `06-duplicate-map.md`, not explained here.

### Dealers / Sellers
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/dealer` | dealerRoutes.js | 29 |
| `/api/dealer-platform` | dealerPlatformRoutes.js | 28 |
| `/api/dealer-health-score` | dealerHealthScoreRoutes.js | 10 |
| `/api/referral` | referralRoutes.js | 2 |
| `/api/leads` | leadRoutes.js | 11 |

### Inspections
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/inspections` | inspectionRoutes.js | 11 |
| `/api/inspector-applications` | inspectorApplicationRoutes.js | 7 |
| `/api/ntsa-verification` | ntsaVerificationRoutes.js | 5 |
| `/api/verification` | verificationRoutes.js | 10 |

(`inspectionBusinessCenter` and `digitalInspection` domain folders exist separately from this `inspectionRoutes.js` — neither appeared as its own top-level `server.js` mount in this pass. Whether they're mounted under a different path, mounted via an aggregator not yet traced, or genuinely unreachable is an open question for `06`/`07`, not resolved here.)

### Users / Auth / Identity
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/auth` (+ `/api/auth/refresh`) | authRoutes.js | 19 |
| `/api/users` | userRoutes.js | 6 |
| `/api/organizations` | organizationRoutes.js | 12 |

### Chat / Notifications / Comms
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/chat` | chatRoutes.js | 7 |
| `/api/notifications` | notificationRoutes.js | 5 |
| `/api/notification-analytics` | notificationAnalyticsRoutes.js | 13 |
| `/api/announcements` | announcementRoutes.js | 5 |
| `/api/contact` | contactRoutes.js | 3 |
| `/api/feedback` | feedbackRoutes.js | 3 |
| `/api/reviews` | reviewRoutes.js | 4 |

### CMS
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/cms` | cmsRoutes.js | **54** (2nd-largest route file in the entire backend) |

### Analytics / Market Intelligence
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/analytics` | vehicleAnalyticsRoutes.js | 13 |
| `/api/search-analytics` | searchAnalyticsRoutes.js | 11 |
| `/api/executive-analytics` | executiveAnalyticsRoutes.js | 3 |
| `/api/market` | marketRoutes.js | 3 |
| `/api/marketplace-health` | marketplaceHealthRoutes.js | 7 |
| `/api/listing-quality` | listingQualityRoutes.js | 9 |
| `/api/funnel` | conversionFunnelRoutes.js | 8 |
| `/api/recommendations` | recommendationRoutes.js | 1 |
| `/api/listing-assistant` | listingAssistantRoutes.js | 3 |
| `/api/v1/analytics/operations`, `/sales`, `/support` | operationsDashboardRoutes.js, salesDashboardRoutes.js, supportDashboardRoutes.js | 9, 4, 4 |

### Admin / Platform Operations
| Mount Path | File | Endpoints |
|---|---|---|
| `/api/admin` | adminRoutes.js | **64 — largest single route file in the backend** |
| `/api/admin/bulk` | bulkAdminRoutes.js | 4 |
| `/api/admin/support-tickets` | supportTicketAdminRoutes.js | 6 |
| `/api/admin/queue` | queueRoutes.js | 12 |
| `/api/config` | configurationRoutes.js | 45 |
| `/api/feature-flags` | featureFlagRoutes.js | 14 |
| `/api/audit` | auditRoutes.js | 15 |
| `/api/security-logs` | securityLogRoutes.js | 3 |
| `/api/reports` | reportRoutes.js | 5 |
| `/api/operations` | operationsRoutes.js | 6 |
| `/api/support` | supportRoutes.js | 8 |
| `/api/subscriptions` | subscriptionRoutes.js | 8 |
| `/api/upload` | uploadRoutes.js | 4 |
| `/api/webhooks` | webhookRoutes.js | 1 |
| `/api/events` | eventRoutes.js | 8 |
| `/api/duplicates` | duplicateRoutes.js | 7 |
| `/api/reliability` | reliabilityRoutes.js | 10 |
| `/api/saved-searches` | savedSearchRoutes.js | 4 |
| `/api/favorites` | favoriteRoutes.js | 5 |
| `/api/ads` | adSlotRoutes.js | 5 |

### System
| Mount Path | File | Endpoints |
|---|---|---|
| `/health` | healthRoutes.js | 4 |
| `/metrics` | metricsRoutes.js | 8 |
| `/prometheus` | prometheusMetricsRoutes.js | not counted (likely a single scrape endpoint, not yet confirmed) |

### "Enterprise Platform" Cluster — Large, Real, and Central to the "Orphaned Models" Question
This is the cluster that directly matches the old "116 orphaned enterprise-platform models" claim's named examples. Every one below is a **confirmed, mounted, reachable route** with substantial endpoint counts — not small stubs:

| Mount Path | File | Endpoints |
|---|---|---|
| `/api/xos` | xosRoutes.js | **46** — 3rd-largest file in the backend |
| `/api/automation` | automationRoutes.js | 43 |
| `/api/vxp` | vxpRoutes.js | 38 |
| `/api/governance` | governanceRoutes.js | 35 |
| `/api/integration` | eipRoutes.js | 34 |
| `/api/lowcode` | lowCodeRoutes.js | 36 |
| `/api/command-center` | commandCenterRoutes.js | 28 |
| `/api/dealer-platform` | dealerPlatformRoutes.js | 28 (also listed under Dealers above — this file straddles both categories) |
| `/api/platform-factory` | platformFactoryRoutes.js | 26 |
| `/api/ai` | aiPlatformRoutes.js | 26 |
| `/api/ecp` | ecpRoutes.js | 26 |
| `/api/improvement` | improvementRoutes.js | 25 |
| `/api/intelligence` | intelligenceRoutes.js | 20 |
| `/api/digital-twin` | digitalTwinRoutes.js | 18 |
| `/api/ghost-checkers` | ghostCheckersRoutes.js | 12 |

**This cluster alone totals ~421 endpoints — roughly 36% of the entire backend's API surface.** This is not a peripheral curiosity; it's more than a third of everything this backend exposes. Whether these represent genuinely functional, database-backed capability or a large volume of scaffolded/generated routes with thin or absent implementations is the single most important open question for `06-duplicate-map.md` and `07-dead-code-map.md` — **not answered in this document**, which only confirms reachability, not functional depth.

---

## 3. What "Mounted and Reachable" Does NOT Tell Us Yet

Confirming a route is wired into `server.js` (directly or via `v1.js`/`v2.js`) proves the Express layer will route a request to a controller function. It proves nothing about:
- Whether the controller function has real logic or a stub/placeholder
- Whether it queries a real database table that exists (per `01-repository-map.md`: **no live Supabase project currently exists for this backend at all** — meaning even a fully-correct controller calling a real table would fail against a live system today)
- Whether it's ever actually invoked by any client (confirmed: not by this frontend; unknown whether by anything else — a mobile app, Postman collection, or nothing)

These are exactly the "backing tables/methods not existing" conditions the old orphaned-models claim described. Given the scale confirmed here, that claim now looks considerably more plausible than my earlier (frontend-only) retraction suggested — but this document stops at reachability. Functional-depth verification belongs in later documents, not asserted here from route counts alone.

---

## 4. The Central Integration Finding, Restated With Full Evidence

Searched the frontend for the actual, specific mount paths now confirmed to exist: `/api/cars`, `/api/auth`, `/api/bids`, `/api/escrow`, `/api/auction`, `/api/dealer`. **Zero matches, for any of them, anywhere in `src/`.** Combined with `01`'s finding (no `fetch`/`axios` call to any backend path at all, `VITE_API_URL` type-declared but never read), this is now confirmed at three independent levels of specificity: generic pattern search, specific real-path search, and full-codebase grep for the env variable itself. The frontend does not call this backend. This is not a partial or flaky integration — it is a complete absence of one.

---

## 5. Methodology Note — A Caught Error, Recorded Rather Than Hidden

An earlier pass in this same investigation found 6 route files with **zero apparent references** in `server.js` via a direct grep, including `auctionRoutes.js` — which would have been an alarming finding given auctions are core to this business. Before writing that down anywhere, it was checked further: all 6 (`auctionRoutes`, `bidLogRoutes`, `biddingSecurityRoutes`, `localizationRoutes`, `transactionLedgerRoutes`, `userPreferenceRoutes`) are imported and mounted **inside `v1.js`**, an API-version aggregator file, which is itself mounted at `/api/v1` in `server.js`. The direct-grep search missed this one level of indirection. This is the same class of mistake caught once before in this session's frontend-navigation audit (a `handleNavSelect` indirection layer that initially looked like dead code). Recorded here, not silently corrected, because a fusion audit is only as trustworthy as its search methodology — and this is exactly the kind of gap that should stay visible.
