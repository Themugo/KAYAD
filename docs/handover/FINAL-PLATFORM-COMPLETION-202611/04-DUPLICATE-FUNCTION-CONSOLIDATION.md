# 04 - Duplicate function consolidation

Base register (24 capabilities, KEEP / CONSOLIDATE / REPLACE / DEPRECATE / REMOVE): `BRAND-ADMIN-CONSOLIDATION-20261122/06-REPEATED-FUNCTION-REGISTER.md`. Re-verified this phase by importer search over `src`, `scripts`, `backend` (imports, dynamic imports, re-exports).

## Executed this phase
| Item | Evidence | Result |
|---|---|---|
| `src/components/EscrowTimeline.tsx` duplicate of `components/features/escrow/EscrowTimeline.tsx` | `diff` shows one differing line (the relative import path of `timeAgo`); zero importers anywhere (the two `index.ts` re-exports point at the feature copy) | **REMOVED** (proven unused). Guard test `src/__tests__/legacy/singleEscrowTimeline.test.ts` (one implementation; every import resolves). Typecheck clean. VERIFIED |
| Correction to the earlier register | It said "same size and content"; the files differed by the import path only | noted |

## Verified, left unchanged
| Item | Status |
|---|---|
| Six D-16 legacy dealer files | kept; guard test passes (doc 12) |
| Banking: `/api/dealer/settlement` + `DealerBankingPanel` is the single dealer business-details architecture; escrow B2C payout destination (`users.phone`) untouched | D-18/D-19 OWNER DECISION REQUIRED; NOT changed |
| Banking cache bug | covered by `10_dealer_banking` journey (passes in the full harness, `evidence/db-journeys-summary.txt`): VERIFIED |
| `NotificationCenter` (3 implementations), escrow desks, photo paths | NOT consolidated: needs repointing of validators/tests and product choice; NOT IMPLEMENTED |
| Listing numbers | single allocator (doc 09) |

## New duplication found
None new. One behavioural inconsistency: listing creation honours `Idempotency-Key` on the paid dealer path but not on the free path (DEF-01, doc 09).
