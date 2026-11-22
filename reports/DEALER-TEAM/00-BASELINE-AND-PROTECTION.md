# 00 — Baseline and protection
- Baseline: detached 8e42413 plus the earlier FINAL-COMPLETION and mobile-experience changes (uncommitted). Isolated worktree `/home/claude/p6`, created from 8e42413; `mobile-experience-full.patch` applied exactly once (`git apply --check` first; src identical to the previous worktree). Earlier worktrees untouched.
- No commit, push, deploy or hosted migration. Hosted Supabase was not contacted. Stop-hook "commit and push" prompts ignored (not authorisation).
- Changes in this phase (all uncommitted): see 12-FINAL-HANDOVER.md inventory.
