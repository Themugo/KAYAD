---
name: Vite config build safety
description: PORT and BASE_PATH guard pattern for Vercel/CI builds
---

## Rule
`vite.config.ts` throws on missing `PORT` and `BASE_PATH` env vars. These vars are injected by Replit at runtime but are NOT present during a Vercel or CI build. Without a guard, the build fails before producing any output.

**Why:** Vercel runs `vite build` in a clean environment without Replit-specific env vars. The throw happens at config-load time, before any build output is written.

**How to apply:** Add a build-context guard at the top of vite.config.ts:
```ts
const isBuildContext =
  process.env.VERCEL === '1' ||
  process.argv.some(a => a === 'build') ||
  (process.env.NODE_ENV === 'production' && !process.env.REPL_ID);
```
Then change throws to: `if (!rawPort && !isBuildContext) { throw ... }` and use `Number(rawPort) || 3000` as the fallback port. The `base` in `defineConfig` receives `basePath || '/'`.
