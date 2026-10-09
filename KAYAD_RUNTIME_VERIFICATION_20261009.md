# Runtime verification — local vs staging vs deployed (2026-10-09)

| Evidence | Local (this container) | Supabase staging | Deployed |
|---|---|---|---|
| Support migration on legacy data ×2, grants, P1–P21 | **PASS** (PostgreSQL 16 + role shim; `evidence/support/migration_legacy_*`, `support_hardening_proof_output_post_integration.txt`) | **NOT RUN** | NOT RUN |
| Hosted-Supabase RLS / `has_function_privilege` for the support objects | n/a | **NOT RUN** — queries listed in `KAYAD_SUPPORT_RUNTIME_CERTIFICATION.md` | NOT RUN |
| Backend process boot + `/api/auctions` against migration-built schema (PostgREST **emulator**, not Supabase) | **PASS** (live/draft/ended 200; deleted car excluded; missing `auction_setups` ⇒ draft 500 reproduced) | NOT RUN | NOT RUN |
| Jest / Vitest / tsc / build / validators | **PASS** (see Test Matrix; 10 inherited validator failures, same on the foundation) | n/a | n/a |
| Browser journeys | **PASS 207/207, mocked HTTP** | NOT RUN | NOT RUN |
| Deployed auction "Internal server error" cause | cause class reproduced locally | NOT RUN | **UNKNOWN** — needs deployed logs / `to_regclass('public.auction_setups')` |
| Email / in-app delivery, load, concurrency | NOT RUN | NOT RUN | NOT RUN |

Node in this container is 22.22.0; the repo contract is ≥22.22.2 (two release validators fail on that alone). No deployment and no production migration was performed.
