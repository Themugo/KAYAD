# KAYAD Agent Memory Index

- [PostCSS root-shadow fix](postcss-root-shadow.md) — artifact needs its own postcss.config.js or root config crash kills Vite
- [Demo force-off pattern](demo-force-off.md) — disableDemoMode() must be enforced at withDemo call-site and network interceptor, not just written to localStorage
- [Demo image quota persistence](demo-image-quota.md) — loadDemoCars must rehydrate seed images after quota-compaction; MAX_EDGE=600 QUALITY=0.4
- [Vite config build safety](vite-config-build.md) — PORT/BASE_PATH throws must be guarded by isBuildContext flag for Vercel CI
