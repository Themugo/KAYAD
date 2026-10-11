# Stage 18 Change Ledger — Public Financing

| File | Change | Reason |
|---|---|---|
| `src/features/FinancePlatform/pages/FinanceMarketplace.tsx` | Added public/account modes; public information-only surface; no public application fetch; safer calculator bounds and disclaimers; account error/retry and stale-response handling | Separate public discovery from private applicant workflow |
| `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | Added existing finance application/tracker component in account mode | Put personal financing records in the authenticated buyer workspace |
| `src/components/DashboardHub.tsx` | Added Vehicle Financing shortcut for buyer/user dashboard to existing buyer workspace | Make private workflow discoverable without creating another portal |
| `src/App.tsx` | Explicitly uses public mode for the public financing route and passes navigation callback | Make public/private rendering intent explicit |
| `backend/controllers/loanApplicationController.js` | Applicant endpoint maps records through explicit DTO excluding reviewer notes/identity and raw fields | Minimize personal endpoint response surface |
| `src/services/loanApi.ts` | Removed reviewer notes from applicant-facing application type | Align client contract with safe applicant DTO |
| `package.json` | Registered repeatable public-financing boundary validator | Repeatable regression check |
| `scripts/validate-public-financing-boundary-20261012.mjs` | New 23-check source boundary validator | Guard public/private separation and API authorization contracts |
