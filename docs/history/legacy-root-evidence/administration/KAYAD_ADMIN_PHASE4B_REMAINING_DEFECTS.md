# Phase 4B Remaining Defects and Blockers

1. Node version is v22.16.0; project requires >=22.22.2.
2. Root `node_modules` is absent.
3. Full typecheck is not certifiable; unresolved dependencies/types cause diagnostics.
4. Production build is blocked (`vite: not found`).
5. Vitest is blocked (`vitest: not found`).
6. Authenticated browser/E2E not run.
7. Proposal screenshot comparison not run.
8. Real runtime payloads for stats, users, vehicles, auction status, staff, departments and providers remain unverified.
9. Keyboard, contrast and responsive behavior have source-level safeguards but need real-browser testing.
10. Active staff count, embedded system-health statuses, department counts, provider connectivity and calendar cannot be filled with invented data; use verified existing sources only.

Release decision: PARTIAL — RUNTIME OR VISUAL CERTIFICATION BLOCKED.
