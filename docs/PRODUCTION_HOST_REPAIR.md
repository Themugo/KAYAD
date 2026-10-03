# KAYAD Production Host Repair Runbook — 2026-10-03

## Observed state

- Vercel project: `kayad-space`
- Latest production deployment: Ready
- `kayad.space` returns HTTP 308 to `https://www.kayad.space/`
- `www.kayad.space` returns Vercel `404 NOT_FOUND`
- `www.kayad.space/api/health` returns Vercel `404 NOT_FOUND`
- Deployment metadata lists `www.kayad.space` as an alias

This combination means the failure is at the Vercel hostname/domain routing boundary rather than inside the Vite application.

## Owner-side repair sequence

1. In Vercel, open project `kayad-space` and confirm `www.kayad.space` is assigned to that project and the production target.
2. Inspect the domain's DNS records at the registrar. The `www` hostname must point to the Vercel target shown by Vercel's Domains page; do not substitute a guessed target.
3. Confirm there is no competing `www` CNAME/A/AAAA record at the registrar.
4. Re-check both hosts:

```text
curl.exe -I https://www.kayad.space/
curl.exe -I https://kayad.space/
curl.exe -i https://www.kayad.space/api/health
curl.exe -i https://api.kayad.space/health
```

5. Only after the public host returns the application shell should the production deployment be considered reachable.

## Do not do

- Do not create a second Vercel project.
- Do not repeatedly redeploy the same commit to try to cure a DNS/alias problem.
- Do not remove the SPA fallback.
- Do not create a second API transport layer.
- Do not declare production certified while the canonical public hostname returns a Vercel platform 404.
