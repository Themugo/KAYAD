# KAYAD Premium Presentation Engineering Pass — 2026-10-01

## Scope

Focused senior-engineering refinement of existing public presentation surfaces only:

- Navbar Sign In / Create Account responsiveness
- Existing homepage hero composition
- Existing standalone login presentation

No new marketplace feature, route, API, registration flow, or business capability was introduced.

## Root cause fixed — auth navigation latency

`AuthRouteSurface` was reading `window.location.pathname` directly while navigation was performed through React Router's `navigate()`.

That meant the URL could change without the route surface subscribing to the router location, so the standalone `/login` and `/register` surfaces could appear delayed until another render occurred.

Correction:

- `useLocation()` is now the authoritative route signal inside `AuthRouteSurface`.
- `App` also uses `useLocation()` for `/verify-email`.
- Navbar navigation remains the existing canonical `navigate('/login')` / `navigate('/register')` behavior.

## Hero refinement

Preserved:

- 390px small/mobile and 420px desktop hero footprint
- real featured vehicle source
- existing vehicle click behavior
- existing primary and secondary CTAs
- existing carousel navigation/autoplay/indicators
- existing admin-managed hero content/background contract
- existing search bridge below the hero

Visual changes:

- converted the vehicle area into a tighter premium automotive stage
- reduced empty visual space around vehicle cards
- added cinematic glass labels and verified-listing treatment
- strengthened depth, shadows, road-stage lighting and image hierarchy
- made the main featured vehicle card the visual anchor
- retained the smaller secondary vehicle card as supporting editorial context

The existing Nairobi/Kenya road fallback remains the Piqsels traffic image already used by the foundation.

## Login refinement

Preserved the canonical authentication implementation and API behavior.

Visual changes:

- refined KAYAD identity/header treatment
- more compact premium login card
- stronger primary CTA hierarchy
- existing password visibility and recovery behavior preserved
- replaced abstract car icon artwork in the presentation panel with the existing KAYAD Prado artwork
- improved automotive stage, road reflection, lighting and glass treatment
- retained the future KAYAD Ads surface without adding an advertising feature

## Tests / validation

### Passed

- Premium presentation validation: **16/16**
- Registration/onboarding source gate: **47/47**
- Registration role matrix: **29/29**
- Explicit auth-flow contract: **19/19**
- Premium auth surface validation: **9/9**
- Frontend runtime contract validation: **PASS**
- Canonical architecture validation: **PASS**

### Environment-blocked

Full `npm ci`, typecheck, build and Vitest execution could not be certified in this environment because the project requires Node `>=22.22.2` while the available runtime is Node `22.16.0`; dependency installation therefore stopped on the engine requirement. A second install attempt with engine enforcement disabled also timed out while resolving packages.

No full-build or Vitest success is claimed.
