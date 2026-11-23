# Merge reconciliation (2026-11-23, verified against GitHub with read-only commands)
## Facts
| Ref | Tip | Notes |
|---|---|---|
| `main` | `5bbf2843` ("Release/kayard combined 20261123 (#269)", 13:11 +03) | Already holds squash merges #266 to #269 and the direct commit `56bbebd3`. Contains the button fix, resend rollback, concurrency guard, `$or` fix and handover docs. **Lacks** the e-mail identity fix (`emailIdentity.js`, wrong-account page, `INVITATION_EMAIL_MISMATCH`). |
| `release/kayard-combined-20261123` | `95c7b49c` | 7 commits that are not in `main`; its code equals the final tree (8 files byte-identical). |
| `release/kayard-invite-identity-20261123` | `5bbf2843` (= `main`) | No commits: the earlier delta script was never applied, so "nothing to commit" was correct. |

## Why the pull request "cannot merge automatically"
`git merge-tree` (no working tree touched) reports **14 conflicted paths**, all **add/add** or **content** conflicts of the same invitation work that reached `main` twice: once as squash commits (#267 to #269 and a direct commit) and once as ordinary commits on the release branch. Code files: `dealerTeamInvitationLifecycle.test.js`, `team-invitation.mjs`, `DealerTeamInvite.test.tsx`, `DealerTeamInvite.jsx`. Evidence/docs: `CHANGED-FILES.md`, `INVITATION-ACCEPTANCE-AUDIT.md`, `README.md`, `TEST-RESULTS.md`, `evidence/browser-invitation-run.txt`, `evidence/browser-invitation/{01,04}.png`, `results.json`, `jest-final-full.txt`, `vitest-final-full.txt`. `dealerPlatformController.js` auto-merges, but an auto-merge is not proof of correct code, so it is not relied on.
No conflict markers exist in `main` or in the final tree (searched).

## Root causes
1. A branch kept receiving work after it had been squash-merged; squash merging discards the link between the two histories, so Git sees the same lines as two unrelated additions.
2. A direct commit to `main` (`56bbebd3`) duplicated work that was also on the release branch.
3. Handover documents were renamed during the audit (`LOGIN-ROOT-CAUSE.md` to `LOGIN-AND-AUTH-AUDIT.md`, `LISTING-RPC-COMPATIBILITY.md` to `LISTING-IDEMPOTENCY-AUDIT.md`, `DEPLOYMENT-TOPOLOGY.md` + `CI-DB-JOURNEYS.md` to `DEPLOYMENT-AND-CI-STATUS.md`) but the old files also reached `main`: **4 duplicate documents** (content already contained in the new names; verified identical or folded).
4. The previous ZIPs (v1 to v3) omitted `.env.production.example` (a tracked config template) because the exclusion filter was too broad. Fixed in v4; no secret was involved.

## Resolution (no history rewrite)
Do not merge `release/kayard-combined-20261123`; treat it as superseded. Branch from the current `main`, apply the 27 differing paths, remove the 4 duplicate documents, open one pull request. Rule going forward: after a squash merge, start the next change from the new `main`.
## Verification of this tree
`main` + 21 overlaid files + 4 removed duplicates = 27 changed paths (5 modified code/test files, 3 new code/test files, the rest documents/evidence). Results are in `TEST-RESULTS.md`.
