# Owner commands (Windows CMD) — NOT executed by Claude

Your earlier push (`74948eebc..9d377b1ac` on `main`) already contains Tasks A–E. This phase's changes are NEW local changes on top of it. Run in your repository folder (`C:\Users\hp\Desktop\KAYARD-KE`). Review before each step.

## 1. Branch and working tree
```
cd /d C:\Users\hp\Desktop\KAYARD-KE
git branch --show-current
git fetch origin
git status --short
```

## 2. Bring this phase's files in
Apply the files from the ZIP `KAYARD-KE-full-project-admin-console-finalisation-20261124.zip` by copying ONLY the files listed in `docs\handover\ADMIN-CONSOLE-COMPLETION-20261124\CHANGED-FILES.md` (section A) over your working copy. Do not extract the whole archive over the repository.

## 3. Review
```
git status --short
git diff --stat
git diff -- supabase src ci backend scripts
```

## 4. Validate (run the backend Jest alone; do not run other heavy processes at the same time)
```
npx tsc --noEmit -p .
npx vitest run
npm run build
cd backend
node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2
cd ..
```

## 5. Stage only the intended files
```
git add supabase\migrations\20261124100000_admin_customer_care_and_market_tables.sql
git add backend\tests\regression\adminConsoleCompletionGuards.test.js
git add src\utils\permissions.ts src\components\admin\AdminSidebar.tsx src\features\AdminView.tsx src\context\AuthContext.tsx
git add src\__tests__\utils\adminPageAccessMirror.test.ts src\__tests__\features\adminCommandCentre.test.tsx
git add ci\db-journeys\29_permission_matrix.mjs ci\db-journeys\run.sh ci\browser\admin-sweep.mjs
git add scripts\admin-ownership-matrix.mjs scripts\admin-completion-matrix.mjs
git add docs\handover\ADMIN-CONSOLE-COMPLETION-20261124 reports\ADMIN-CONSOLE
git status --short
```
Do not add `backend\data\uploads.sqlite` (gitignored runtime data).

## 6. Commit (after your review)
```
git commit -m "Admin console finalisation: role-matrix journey, UI access mirror, migration rehearsal and runbook" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

## 7. Push (only after you authorise it)
```
git push origin main
```
If rejected as non-fast-forward: `git pull --rebase origin main` is NOT recommended here; use `git fetch origin` then `git log --oneline main..origin/main` and paste the output for review. Never force-push.

## 8. Hosted migrations (separate approval; not part of the push)
Follow `MIGRATION-REHEARSAL-AND-PRODUCTION-RUNBOOK.md` exactly: order, preconditions, verification queries, recovery.
