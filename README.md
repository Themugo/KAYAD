# KAYAD

KAYAD is a production automotive marketplace for Kenya. The repository contains the React/Vite frontend, Node/Express backend, Supabase/Postgres migrations, deployment configuration, and production validation tooling.

## Runtime contract

- Node.js: `>=22.22.2` (see `.nvmrc` and both package manifests)
- Frontend: Vite on port `3000`
- Backend: Node/Express on port `5000` by default
- Database: Supabase/Postgres, with schema defined by `supabase/migrations/`
- Authentication: KAYAD's application authentication (`users` / `user_auth`); this project does not use Supabase Auth as its application identity layer.

## Local development

1. Install frontend dependencies:
   `npm install`
2. Configure the frontend environment from `.env.example`.
3. Install backend dependencies:
   `cd backend && npm install`
4. Configure backend environment from `backend/.env.example`.
5. Start the backend and frontend using the repository's startup scripts or the package scripts.

The normal local frontend URL is `http://localhost:3000`.

## Validation

From the repository root:

```text
node scripts/validate-phase58.mjs
node scripts/validate-phase59.mjs
npm run lint
npm run build
```

Backend tests run from `backend` with `npm test`.

## Production deployment truth

Deployment readiness is never inferred from a stale template, demo environment, or external service that has not actually been checked. Use the deployment validation scripts and the target hosting provider's environment configuration as the source of deployment state.

Secrets must be supplied through the deployment environment. Do not commit `.env` files or real credentials.

### Canonical production deployment

The authoritative frontend deployment path is the pinned Vercel workflow in `.github/workflows/deploy.yml`.

- Vercel project: `kayad-space`
- Production hostname: `https://www.kayad.space`
- API hostname: `https://api.kayad.space`
- Vercel CLI: `60.1.3`
- Node: `22.22.2` in CI/local certification
- Production sequence: `npm ci` → validation → `npm run build` → `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` → `npm run verify:production`

Do not use legacy `vercel --prod` shortcuts or manually mix preview and production project targets. Custom-domain DNS is a separate gate from the application deployment; verify it with `vercel domains verify`.

