---
name: PostCSS root-shadow fix
description: Why artifacts/kayad needs its own postcss.config.js and what happens without it
---

## Rule
Every artifact that uses Tailwind v4 via `@tailwindcss/vite` must have its own `postcss.config.js` (with empty plugins `{}`) inside the artifact directory.

**Why:** Vite searches upward from the artifact's `searchPath` for a PostCSS config. The workspace root has a `postcss.config.js` that references `autoprefixer`, which is not installed at the root level. Without the artifact-level shadow file, Vite crashes at CSS processing time with "Cannot find module 'autoprefixer'". This crash shows as a full red error overlay in the browser, blocking the entire app.

**How to apply:** When creating a new Vite + Tailwind v4 artifact, always create `artifacts/<name>/postcss.config.js`:
```js
export default { plugins: {} };
```
This shadows the root config and prevents the upward search from finding it.
