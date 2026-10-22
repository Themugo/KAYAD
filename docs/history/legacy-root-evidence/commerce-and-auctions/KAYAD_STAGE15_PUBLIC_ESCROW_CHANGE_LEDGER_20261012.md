# Stage 15 Change Ledger — Public Escrow Services

Foundation: Stage 14 ZIP SHA-256 `440f74d8807a30df0cd4f790d4cd0ce0be5ceda182c22dd38dc04b8bbcfc8b36`.

| File | Change | Reason |
|---|---|---|
| `src/features/EscrowView.tsx` | Replaced mixed public/private tab UI with a public-only information page and role-appropriate dashboard CTA. | Keep transaction records and staff operations off the public page. |
| `src/features/escrow/PublicEscrowExplainer.tsx` | Updated eligibility/pause wording; removed automatic-release timing promise; shows funding method from published rules; CTA leads to the user's dashboard. | Avoid misleading claims where configuration and runtime release schedules differ. |
| `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | Replaced summary-only purchase list with `ParticipantEscrowDesk`; reset desk by user ID and preserve a deal deep link. | Give buyers authenticated access to their own deal workflow. |
| `src/pages/dealer/dashboard/DealerDashboard.tsx` | Added a dedicated Escrow section with `ParticipantEscrowDesk`, keyed by user identity. | Keep dealer-side deal workflow in the dealer portal. |
| `src/App.tsx` | Added lazy-loaded staff escrow operations surface; protected it with the existing staff-role policy and added it to private-workspace navigation handling. | Move staff queues and actions away from public navigation. |
| `src/components/navigation/navConfig.ts` | Made Escrow a direct public navigation destination without private deal/operations submenu links. | Avoid advertising private surfaces in public navigation. |
| `src/utils/navLocation.ts` | Canonicalizes legacy escrow tab destinations to `?nav=escrow`. | Prevent old deep links from landing on a blank/private public-route state. |
| `src/components/Footer.tsx` | Changed “Escrow Vault” to “Escrow Services.” | Remove unsupported vault-style naming from the shared footer. |
| `src/components/layout/Footer.tsx` | Changed “Escrow Vault” to “Escrow Services.” | Keep the legacy shared footer consistent. |
| `src/pages/EscrowPage.jsx` | Replaced obsolete duplicate page with redirect to canonical public page. | Remove outdated universal M-Pesa escrow claims and private-record fetch from the legacy page. |
| `src/__tests__/components/EscrowView.test.tsx` | Tests public-only boundary; participant and staff behavior tests now target their specific desk components. | Test the actual public/private component boundaries. |
| `src/__tests__/pages/EscrowPage.test.jsx` | Tests legacy redirect. | Prevent the obsolete duplicate page from returning. |
| `src/__tests__/utils/navLocation.test.ts` | Added legacy escrow deep-link normalization tests. | Ensure old tab URLs safely resolve to the public page. |
| `scripts/validate-public-escrow-boundary.mjs` | Added 14 static boundary assertions. | Repeatable regression check for public/private escrow separation. |
| `package.json` | Added `validate:public-escrow-boundary` script. | Make the new check easy to rerun. |

No migrations or backend financial logic were changed. Existing buyer/dealer dashboard sections beyond the escrow relocation were not audited in this stage.
