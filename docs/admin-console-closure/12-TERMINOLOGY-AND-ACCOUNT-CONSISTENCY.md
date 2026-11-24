# 12 — Terminology and account-consistency audit

Method: `grep -rniE "private[ _-]?seller|individual[ _-]?seller" src` (≈40 non-test files) then classification of every distinct occurrence kind. Rule applied: change only **misleading user-visible** labels; preserve identifiers, config keys, API paths, DB values and escrow configuration.

| Class | Occurrences (representative) | Decision |
|---|---|---|
| **A. Code identifiers** (types, imports, hooks, component/file names: `PrivateSellerApplication`, `privateSellerCapabilityApi.ts`, `usePrivateSellerCapability`, `PrivateSellerPlatform/`) | ~60 | Keep — renaming risks API/test churn with no user benefit. |
| **B. Config / escrow keys & API contracts** (`privateSellerRegistration`, `privateSellerPackageMode`, `privateSellerRequirement`, `escrowRulesConfig.ts`, `/api/private-seller/*`, `dealerType=private`) | ~25 | Keep — stored data and public contracts. |
| **C. Data values of a listing's seller type** (`sellerType === 'Private Seller'`, `dealer.type`) | ~15 (VehicleCard, VehicleDetailModal, TrustBadgeMatrix, DealerProfileModal, CartyGrid fallback name) | Keep. Describes *who is selling this listing* (non-dealer), not an account category or approval. Recommend a later product decision to display "Individual seller" consistently. |
| **D. Public filter/label text** (`SearchSidebar` "Private Sellers", `VehicleMarketplace` seller-type option, `DealerProfileModal` headings, `DealerLayout` role map `individual_seller: 'Individual Seller'`) | ~8 | Defer — public copy, owner-approved homepage/marketplace wording; not an approval claim. Logged as recommendation R-12-1. |
| **E. Admin labels** | AdminUsers role filter "Legacy seller accounts"; role label "personal account (legacy)"; status "Active" with "Legacy record" note; page title "Personal accounts: selling status"; route `/admin/private-seller-applications` retained as URL | **Already corrected** (03). No remaining misleading admin text found. |
| **F. Legal/FAQ copy** (`LegalPage` "Private sellers can list within the limits shown in the seller area", SupportFAQ) | 3 | Keep — states sellers need no dealer approval; accurate. |
| **G. Tests** | many | Keep. |

No remaining text says a personal account requires seller approval, a package or a fee. `individual_seller` is never offered as a registration role (grep of register forms/`authRoutes` confirms only legacy handling).

Recommendations (not executed): R-12-1 unify public wording to "Individual seller"; R-12-2 rename route alias to `/admin/personal-accounts` with redirect (keep old URL).
