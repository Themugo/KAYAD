# Frontend Docker Build Context

This directory contains only the Docker build configuration for the frontend.

The actual frontend source (`src/`, `index.html`, `package.json`) lives at the repository root.
This is because Vite expects the project root to be the same as the source root.

See `frontend/Dockerfile` for the multi-stage build that:
1. Copies the entire repo as build context
2. Installs dependencies from root `package.json`
3. Builds the Vite app into `dist/`
4. Serves via Nginx

For local development, run from the repo root:
```bash
npm install
npm run dev
```
