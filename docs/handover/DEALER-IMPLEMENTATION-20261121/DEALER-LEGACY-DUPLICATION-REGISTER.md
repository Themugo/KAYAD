# Legacy and duplicate register

Nothing was deleted in this pass. The dependency evidence is in `docs/handover/DEALER-ACCOUNT-20261121/DEALER-ACCOUNT-DEPENDENCY-MAP.md` and `…DUPLICATE-LEGACY-REGISTER.md`; deletion is proposed only after the owner confirms.

| Item | Proof of use | Decision |
|---|---|---|
| `src/pages/dealer/DealerAnalytics.jsx`, `DealerSettings.jsx`, `DealerTeam.jsx` | no importers, no tests | Candidate for removal (owner approval) |
| `src/pages/dealer/DealerDashboard.jsx` | imported only by its own test | Candidate; remove with that test after approval |
| `DealerAuctionSetup.jsx` | superseded by `DealerAuctionSetupWizard`; 1 test | Candidate |
| `src/pages/dealer/components/*` (6 files) | orphaned | Candidate |
| `features/DealershipWorkspace` | lazily mounted; `useMyDealership` used by Navbar and DashboardHub | **Keep** (it is the staff workspace) |
| `/api/dealer/team*` (legacy) vs `/api/dealer-platform/team*` (live) | legacy invite returns 410, GET still 200 | Keep until clients are confirmed migrated |
| `src/components/layout/DealerSidebar.tsx` | references `/dealer/settlement` | Not audited for imports; do not remove without a dependency check |
Why nothing was removed: the standing rule is "delete only after proof, never on grep alone", and removing screens is a product decision.
