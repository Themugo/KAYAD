# Stage 5F.5 runbook — how the evidence in the report was produced

Everything here is **read-only with respect to hosted systems**. Nothing in this folder connects to the hosted Supabase project,
Render, Vercel or Brevo. The real-stack scripts refuse anything that is not the loopback disposable stack.

| Item | What it is | Tier |
|---|---|---|
| `harness/role_api_5f5.mjs` | 88 real-API checks (identity propagation, D-1/D-2/D-3/D-4/D-5/D-6/D-12/D-13/D-14, owner-only staff governance, governance audit trail, Command Centre contract vs SQL counts) | local runtime, real backend + real PostgreSQL 16 (disposable) |
| `harness/ui_5f5_admin.mjs` | Chromium journeys: Command Centre tiles → canonical queues, forged client state, limited staff, owner tab, phone/tablet/desktop, axe-core WCAG2A/AA, keyboard | local runtime, real SPA + API + DB |
| `tools/route_inventory.mjs`, `classify.mjs`, `admin_matrix.mjs` | static AST route inventory (acorn) and guard classification | source |
| `tools/route_inventory_5f5.tsv` | the inventory output for this tree | source |

## Re-running (loopback only)
1. Start the disposable stack exactly as in the Stage 5C runbook (`start_stack.sh`): PostgreSQL 54339 → PostgREST 54340 → prefix proxy 54341 → backend 5050 → Vite 5173,
   with `KAYAD_ROOT` pointing at this tree. Database name must end in `_disposable`.
2. Copy `harness/*.mjs` next to the Stage 5C `lib.mjs` / `api.mjs` and run `node role_api_5f5.mjs` then `node ui_5f5_admin.mjs`.
3. Unit/integration tests need no stack: `cd backend && npm run test:jest`, `npx vitest run` at the root.

No test in this stage applies a migration. The owner-governance migration candidate was only *rehearsed* on the disposable database
(`runbooks/stage5b-owner-governance-20261019/pg-tests/*`, 97 + 15 checks) and remains NOT APPLIED anywhere.

## Addendum (final run notes)
- `ui_5f5_admin.mjs`: set `RESTART_BACKEND_SCRIPT` to a script that restarts the disposable backend; the harness calls it after seeding so `/api/admin/stats` (cached 300 s, finding F-4) is read cold.
- `role_api_j` requires the backend started with the single-owner env (`restart_backend_5e.sh`); `role_api_f/g` require the local Cloudinary stub on 127.0.0.1:9099.
- Disposable stack only. Nothing here touches Render, Vercel, Supabase hosted or Brevo/SMS live providers.
