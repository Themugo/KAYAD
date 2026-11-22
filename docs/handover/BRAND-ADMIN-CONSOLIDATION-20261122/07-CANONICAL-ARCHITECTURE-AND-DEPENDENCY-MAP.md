# 07 - Canonical architecture and dependency map

Verified by reading code and by running the stack on baseline a652701 plus this phase's changes.

## Identity and workspaces
| Identity | Role | Workspace | Authorisation |
|---|---|---|---|
| Personal account (buy and sell) | `user` | `DashboardHub` personal sections (state-based navigation, no URL per section) | Cookie session + CSRF; ownership checks per record |
| Dealer business | dealer owner / team | Dealer Hub (`/dealer`), 15 sections | Owner-only `/api/dealer`; permission-scoped `/api/dealer-platform` |
| Staff | admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker | Admin console (`/admin`, about 52 routes via `AdminRouteSurface.tsx`) | `backend/config/roles.js`; per-route guards; evidence in doc 11 |
| System owner | not seeded in test DB | - | NOT TESTED |

## Capability to canonical module
| Capability | Frontend | API | Data |
|---|---|---|---|
| Brand | `BrandMark`, `BrandingContext` (`DEFAULT_LOGO_URL`, `DEFAULT_LOGO_DARK_URL`) | branding settings | `public/branding/*` |
| Dealer listing lifecycle | `DealerListingForm`, dealer dashboard | `/api/dealer`, `/api/dealer-platform` | `kayad_dealer_listing_lifecycle_atomic`, `dealer_listing_counters` |
| Banking (dealer) | `DealerBankingPanel`, Settings Banking tab | `GET/PUT /api/dealer/settlement` | `dealers.payment_details` (jsonb, masked read) |
| Escrow | `ParticipantEscrowDesk`, `EscrowOperationsDesk` | `/api/escrow/*` | escrow ledger tables; payout B2C to `users.phone` (D-18) |
| Offers | `MarketplaceOfferPanel` | `/api/leads/:leadId/offers[...]` | `marketplace_offer_settlements` |
| Notifications | `NotificationContext`, `NotificationsPage` | notification routes | notifications tables |
| Admin overview | `AdminDashboard` + command-centre CSS | `/api/admin/*` | multiple |
| Audit/security log | `AdminSecurityLog` | `securityLogController` (fallback to audit logs fixed this phase) | `security_logs`, `audit_logs` |

## Dependencies that constrain changes
- Legacy dealer files (D-16) are read by 7 validators (validate-dealer-workspace-navigation, validate-dealer-operations-initiative, validate-dealer-workforce-access, validate-lead-crm-domain-end-to-end, validate-offer-negotiation-ui, validate-dealer-commercial-controls, validate-subscription-domain-e2e). All 7 pass. Removing the files requires repointing those validators first.
- Notification and escrow-timeline duplicates are referenced by validators and tests (doc 06 rows 12-13).
- M-Pesa `AccountReference` default `KAYAD` (`backend/services/mpesaService.js:190`) and inspection booking prefix `KAYAD` are payment/reference identifiers; do not rename (doc 02).
- Hosted database: project "KAYAD EA"; migration history ends 20260922; about 86 repository migrations are unapplied (dealer lifecycle objects, listing counters missing). Hosted also has `market_data` and `ntsa_verification_requests` with no repo migration (drift, D-20). No hosted writes were made.

## Navigation model
Personal and dealer workspaces navigate by internal state; the admin console navigates by routes. Mobile personal menu is a `<details>` drawer; dealer and admin use sidebar drawers. Admin sidebar groups: Command Centre, Marketplace, Accounts & Onboarding, Finance, Customer Care, Growth & Insight, Platform & Security. 17 admin routes have no nav link (D-21).
