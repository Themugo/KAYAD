# KAYAD — Production + Mobile Continuation Sweep
## 2026-10-03 — Next Foundation

Base: `KAYAD-main-VERCEL-MOBILE-FOUNDATION-20261003.zip`

## Changes in this continuation

### 1. PWA icon contract repaired
The previous foundation referenced PNG icons that were not present in `public/icons/`. This was a real installability/mobile-shell defect.

Added canonical assets:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/badge-72.png`

Updated the existing SVG source artwork to KAYAD's current Slate Teal/light visual language rather than the obsolete near-black artwork.

`index.html` now has `viewport-fit=cover` so iOS safe-area insets are available to the existing mobile navigation/layout rules.

### 2. PWA shortcuts corrected
The previous manifest shortcuts used `/browse`, `/auctions`, and `/seller/add`. KAYAD's current shell is state-driven and does not use those as canonical customer navigation routes.

Shortcuts now target:
- `/?nav=marketplace&source=pwa`
- `/?nav=auctions&source=pwa`
- `/?nav=sell&source=pwa`

This means an installed PWA launches the same real application state used by the web UI instead of depending on retired/compatibility routes.

### 3. Service-worker data safety hardened
The service worker no longer caches API responses. This prevents cookie-authenticated or rapidly changing marketplace responses from becoming stale browser cache entries.

Authentication endpoints remain explicitly excluded from service-worker interception.

Static/navigation/image behavior remains available for the existing mobile shell.

### 4. Code-splitting contract reconciled
The code-splitting validator still required the retired `AuctionDiscoveryNetwork` lazy import even though `AuctionsView` is the canonical customer-facing auction discovery surface.

The validator now checks the actual architecture:
- `AuctionsView` remains lazy-loaded.
- `activeNav === 'discovery'` resolves to the canonical `AuctionsView`.
- No eager import of the retired discovery surface is introduced.

No duplicate auction UI was resurrected.

### 5. New certification gate
Added:

`npm run validate:pwa-mobile`

It verifies:
- viewport contract
- manifest linkage
- Apple touch icon
- PNG icon existence
- push badge
- canonical manifest icons
- state-driven PWA shortcuts
- no API caching in the service worker
- auth endpoint exclusion
- current cache versions

## Validation performed

PASS — frontend runtime contracts
PASS — deployment readiness
PASS — Vercel CI contract
PASS — deployment/runtime drift 17/17
PASS — homepage convergence
PASS — private upload cache
PASS — code splitting
PASS — UI surface convergence
PASS — auction transport convergence
PASS — canonical architecture
PASS — foundation integrity
PASS — registration/onboarding 47/47
PASS — explicit auth flows 19/19
PASS — premium auth surfaces 9/9
PASS — domain lifecycle integrity
PASS — high-risk boundaries
PASS — payment gateway lifecycle 13/13
PASS — payment/escrow domain 9/9
PASS — transactions & money 23 checks
PASS — migration hygiene 147 migrations
PASS — PWA/mobile contract 11/11
PASS — `node --check` service worker and validators
PASS — manifest JSON parsing

## Certification boundary

A full `npm ci`, TypeScript check, Vite production build and complete Vitest suite are still intentionally not claimed from this execution environment because it exposes Node `22.16.0`, while the repository contract is Node `>=22.22.2` and both local version files pin `22.22.2`.

The GitHub/Vercel workflows already pin Node `22.22.2`, so the authoritative build gate remains CI on that runtime.

## Next production sequence

```text
1. Extract this foundation on the Windows build machine
2. Confirm node --version = 22.22.2+
3. npm ci
4. npm run typecheck
5. npm run build
6. npm test
7. npm run validate:pwa-mobile
8. git add -A
9. git commit -m "feat: harden mobile pwa and production foundation"
10. git push origin main
11. GitHub CI validates the production build
12. Vercel deployment runs from the pinned production workflow
13. verify:production checks deployment identity + public/API runtime
14. Test on a real iPhone/Android device
```

## Explicitly not changed

- No second marketplace implementation
- No second auction implementation
- No replacement API transport
- No new authentication system
- No new payment/escrow state machine
- No Supabase browser client reintroduced
- No business rules or transaction semantics changed
