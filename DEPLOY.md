# KAYAD Production Deployment — Vercel + Render

## Canonical production topology

- **Frontend:** Vercel / Vite SPA
- **API:** Render at `https://api.kayad.space`
- **Database/Auth/Storage:** Supabase
- **Realtime:** Socket.IO served by the Render API
- **Email:** Brevo
- **Frontend browser API contract:** same-origin `/api` on Vercel, proxied to Render

The browser must not contain backend secrets.

## Vercel environment variables

Set these as **Production** variables in the intended Vercel project:

```text
VITE_API_URL=/api
VITE_SOCKET_URL=https://api.kayad.space
VITE_PUBLIC_URL=https://www.kayad.space
```

Keep secrets such as service-role keys, Brevo keys, database credentials, Redis/Valkey credentials and provider credentials on the backend/Render side only.

## GitHub Actions deployment

The repository already contains the production workflow:

`.github/workflows/deploy.yml`

The workflow:

1. Uses Node `22.22.2`.
2. Runs the release/runtime validation gates.
3. Builds the frontend.
4. Installs pinned Vercel CLI `60.1.3`.
5. Links the explicitly configured Vercel project.
6. Pulls production Vercel settings.
7. Runs `vercel build --prod`.
8. Deploys the prebuilt artifact with `vercel deploy --prebuilt --prod`.
9. Verifies the deployment URL, `/release.json`, public frontend shell, API health and CSRF bootstrap.

Required GitHub repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

The workflow intentionally fails if these are missing; it never reports a successful deployment while production may still be serving an older release.

## Local release gate

Run this on a machine with **Node 22.22.2 or newer**:

```powershell
npm ci
npm run validate:frontend-runtime-contracts
npm run validate:deployment-readiness
npm run validate:vercel-ci
npm run validate:deployment-runtime-drift
npm run validate:homepage-convergence
npm run typecheck
npm run build
npm run test
```

For a real production certification:

```powershell
$env:EXPECTED_COMMIT = (git rev-parse HEAD)
$env:DEPLOYMENT_URL = "<Vercel deployment URL returned by the deploy command>"
$env:PUBLIC_URL = "https://www.kayad.space"
$env:API_URL = "https://api.kayad.space"
npm run verify:production
```

## Production acceptance

Do not classify the release as live-certified until all of these are observed against the real deployment:

- Vercel deployment returns HTTP 200.
- `/release.json` commit equals the intended commit.
- Public production domain returns the KAYAD SPA shell.
- `/api/health` is healthy/ok.
- `/api/v1/auth/csrf` returns a valid CSRF token.
- Browser `/api/*` requests reach Render through the Vercel rewrite.
- Login/register cookies survive the Vercel → Render boundary.
- Socket.IO connects from the production browser.
- Vehicle catalogue loads on a narrow mobile viewport.
- Mobile filter drawer, saved, compare, sign-in and sell flows remain reachable.
- Auction mobile dock does not collide with the public marketplace dock.
- Real dealer registration → verification → login journey succeeds.
- Supabase and Render/Valkey production readiness is confirmed.

## Mobile release acceptance

At minimum test:

- 320px wide phone
- 375px wide phone
- 390px wide phone
- 430px wide phone
- iOS Safari
- Android Chrome

Check specifically:

- no horizontal page scroll
- bottom navigation respects the safe area
- primary controls have comfortable touch targets
- hero copy and featured vehicle card do not overlap
- inventory cards remain one-column and readable
- search/filter controls wrap without clipping
- modals/drawers stay inside the viewport
- fixed action bars do not cover important content
- reduced-motion preference is respected

## Important

The repository's source gates can prove source/deployment-contract readiness, but they cannot prove the real Vercel/Render/Supabase runtime from an offline or under-versioned environment. Live certification must be performed after the intended commit is deployed.
