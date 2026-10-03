# Vercel source deployment guard — 2026-10-03

The repository must deploy from source using `vercel.json` and must not carry `.vercel/output` build artifacts.

## Required source contract
- Framework: Vite
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- `/api/:path*` rewrite precedes SPA fallback
- Node: `>=22.22.2`

## Required Git state
`.gitignore` already excludes `.vercel/`. If older commits tracked it, remove the tracked entries once:

```cmd
git rm -r --cached .vercel
git commit -m "fix: remove tracked vercel build artifacts"
git push origin main
```

Do not commit `.vercel/output`, `dist`, or local deployment metadata.
