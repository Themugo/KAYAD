---
title: CONTRIBUTING
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Contributing to Kayad

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/KAYAD.git`
3. Install frontend deps: `npm install`
4. Install backend deps: `cd backend && npm install`
5. Copy `.env.example` to `.env` and fill in values
6. Start backend: `cd backend && npm run dev`
7. Start frontend (new terminal): `npm run dev`

## Development Workflow

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Run linting
npm run lint

# Run tests
npm test
cd backend && npm test

# Commit changes
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

- Create a branch from `main` for your changes
- Run `npm run lint` and fix all errors before committing
- Run `npm test` (frontend) and `cd backend && npm test` (backend)
- Keep PRs focused on a single concern

## Code Style

- ESLint + Prettier are configured — use them
- No semicolons, single quotes, 2-space indentation
- React components use JSX, not `createElement`
- Lazy-load route pages via `React.lazy()`

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `security:`

## Pull Requests

- Link any related issues
- Include a clear description of what changed and why
- Verify tests pass before requesting review
