# KAYAD Canonical Production Deployment Runbook — 2026-10-02

## Authority

This is the single operational deployment path for the `kayad-space` Vercel project.

- Project: `kayad-space`
- Scope: `themugos-projects`
- Project ID: `prj_O3uu4usKUnRzZM1t6j5ZTqUXBkAG`
- Node: `22.22.2` locally/CI; Vercel project runtime `22.x`
- Vercel CLI: `60.1.3`
- Frontend canonical hostname: `https://www.kayad.space`
- API: `https://api.kayad.space`

## Repository rules

1. `.vercel/` is generated local state and must not be committed.
2. `.env.local`, `.env.production.local`, and real secrets must never be committed.
3. Production deployment uses the GitHub Actions workflow in `.github/workflows/deploy.yml`.
4. Manual production deployment must use the same sequence as CI.
5. Do not use `vercel --prod` as a shortcut.
6. Do not deploy preview URLs as production aliases.
7. Do not delete or recreate the Vercel project to solve a domain problem.
8. Application deployment and custom-domain DNS are separate gates.

## Clean local certification

```cmd
cd /d "C:\Users\hp\Desktop\KAYAD-main"
node --version
npm --version
vercel --version
npm ci
npm run typecheck
npm test
npm run build
npm run validate:deployment-readiness
npm run validate:vercel-ci
```

## Vercel production deployment

```cmd
vercel whoami
vercel link --yes --project prj_O3uu4usKUnRzZM1t6j5ZTqUXBkAG --scope team_XhmiqhpCm1TteJizrxloVEwJ
vercel pull --yes --environment=production --scope themugos-projects
vercel build --prod --scope themugos-projects
vercel deploy --prebuilt --prod --scope themugos-projects
```

Record the exact deployment URL returned by Vercel.

## Production verification

```cmd
set DEPLOYMENT_URL=<returned-vercel-deployment-url>
set PUBLIC_URL=https://www.kayad.space
set API_URL=https://api.kayad.space
npm run verify:production
```

## Domain verification

```cmd
vercel domains verify kayad.space --project kayad-space --scope themugos-projects
vercel domains verify www.kayad.space --project kayad-space --scope themugos-projects
```

If DNS is externally hosted, make only the DNS changes Vercel reports. Do not remove unrelated MX/TXT records used by email or other services.

## Current incident pattern

If:

- `kayad.space` returns a redirect to `www.kayad.space`, and
- `www.kayad.space` returns `404 NOT_FOUND`, while
- the Vercel deployment is `Ready / Production`,

then the application deployment is not the first suspect. Check domain verification and DNS routing before rebuilding or redeploying the application.

## Release rule

A release is not considered production-certified until:

1. repository validation passes,
2. Vercel deployment is `Ready / Production`,
3. `/release.json` matches the intended commit,
4. the canonical public hostname returns the KAYAD HTML shell,
5. API health and CSRF bootstrap pass,
6. custom-domain DNS verification passes.
