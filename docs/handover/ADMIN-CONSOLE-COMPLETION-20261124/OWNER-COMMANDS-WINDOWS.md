# Owner Commands (Windows CMD) — NOT executed by Claude

Run from your repository folder. Review before each step. Nothing below has been run for you.

```
cd /d C:\path\to\your\kayad-repo
git branch --show-current
git status --short
git diff --stat
git diff --name-only
```

Validation (backend Jest alone; do not run frontend suites at the same time):
```
npx tsc --noEmit -p .
npx vitest run
npm run build
cd backend
node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2
cd ..
```

Stage, commit, push (only when you decide to):
```
git add -A
git status --short
git commit -m "Super Admin console: end-to-end completion, schema remediation, honest unavailable states" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin HEAD
```

Hosted migrations (separate owner decision; never applied by Claude), in order:
1. `supabase/migrations/20261123210000_lead_create_find_before_insert.sql`
2. `supabase/migrations/20261123220000_dealer_temporary_duties.sql`
3. `supabase/migrations/20261124100000_admin_customer_care_and_market_tables.sql`

Use your normal reviewed migration process; reload PostgREST afterwards (`NOTIFY pgrst, 'reload schema'`).
