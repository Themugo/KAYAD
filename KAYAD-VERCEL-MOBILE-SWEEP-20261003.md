# KAYAD — Vercel + Mobile UX Convergence Sweep
## 2026-10-03

Foundation: `KAYAD-main-DEPLOY-FIXED-20261003.zip`

### Scope

This sweep deliberately avoids creating a second marketplace, navigation system, API transport or auction state model.

### Mobile changes

1. **Canonical public mobile navigation**
   - Mounted the existing `MobileBottomNav` into the real `AppInner` surface.
   - Converted it from hard-coded React Router destinations (`/gallery`, `/favorites`, `/compare`, etc.) to KAYAD's existing state-driven navigation.
   - Search scrolls to the real `#market-results` surface.
   - Compare opens the existing compare modal.
   - Saved uses the existing saved-vehicle state.
   - Account uses the real authenticated user state or the existing auth navigation.
   - Auction/payment/profile surfaces retain their existing specialized `AuctionMobileDock`.

2. **No duplicate mobile dock on auction surfaces**
   - The specialized auction dock remains authoritative for auction/payment/profile flows.
   - The public marketplace dock is hidden on those specialized surfaces.

3. **Safe-area/content protection**
   - Public mobile main content receives bottom space for the fixed navigation and device safe area.
   - The marketplace result anchor receives a mobile scroll margin so fixed navigation/header chrome does not cover the destination.

4. **Mobile hero stability**
   - Increased the narrow-screen editorial hero height from 390px to 470px so the existing copy, actions, live signals, featured vehicle card and slide controls have enough vertical separation.
   - No vehicle data or business logic changed.

5. **Touch/interaction polish**
   - Mobile marketplace toolbar controls receive comfortable minimum heights.
   - Mobile inventory remains one-column at narrow widths.
   - Reduced-motion behavior remains respected.

6. **PWA shell**
   - Added manifest and mobile-web-app metadata to `index.html`.
   - Added favicon and Apple touch icon references.
   - Updated the manifest launch/theme colors to KAYAD's current light Slate Teal visual system instead of the obsolete near-black theme.

### Vercel/deployment status

Existing Vercel deployment architecture was retained:

- Vercel SPA build: `npm run build`
- deterministic install: `npm ci`
- API rewrite before SPA fallback
- generated `release.json`
- pinned Vercel CLI `60.1.3`
- explicit `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
- post-deploy production verifier

Existing source gates run against this foundation:

- Frontend runtime contracts: PASS
- Deployment readiness: PASS
- Vercel CI contract: PASS
- Deployment/runtime drift: PASS 17/17
- Homepage convergence: PASS

### Certification limitation

This execution environment is running Node `22.16.0`. KAYAD requires Node `>=22.22.2`.

`npm ci` correctly rejected the environment on the engine contract. A forced dependency install was attempted but could not complete reliably in this environment, so a production Vite build/typecheck is **not claimed** here.

The correct final certification must run on Node 22.22.2+ and then use:

```text
npm ci
npm run typecheck
npm run build
npm run test
npm run verify:production
```

No live Vercel/Render production PASS is inferred from source inspection.
