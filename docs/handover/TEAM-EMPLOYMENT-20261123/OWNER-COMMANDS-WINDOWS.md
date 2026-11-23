# Owner commands (Windows CMD) — NOT executed by Claude

Replace `C:\path\to\kayard` with your repository. Nothing below commits, pushes or deploys until YOU run it.

## 1. Inspect the repository
```
cd /d C:\path\to\kayard
git branch --show-current
git status --short
git remote -v
git diff --stat
git diff --name-only
git diff -- backend\controllers\dealerPlatformController.js
git diff -- supabase\migrations
```
## 2. Verify the new ZIP (CMD)
```
certutil -hashfile KAYARD-KE-full-project-team-employment-updated-20261123.zip SHA256
```
Compare with `SHA256SUMS.txt` / the value reported in the delivery message. Extract into a NEW empty folder (never over the repository):
```
mkdir C:\temp\kayard-te && tar -xf KAYARD-KE-full-project-team-employment-updated-20261123.zip -C C:\temp\kayard-te
```
## 3. Tests
```
cd backend && npm ci && node --max-old-space-size=3072 --experimental-vm-modules node_modules\jest\bin\jest.js --forceExit --maxWorkers=2
cd .. && npm ci && npx vitest run && npx tsc --noEmit -p . && npm run build
```
(DB journeys need Linux/WSL + PostgreSQL + PostgREST + Redis: `ci/db-journeys/run.sh`.)
## 4. Database — hosted, read this first
The migration `supabase\migrations\20261123200000_dealer_employment_and_staff_identity.sql` is **additive** but it is a production change. Rehearse on a Supabase branch or a restored copy first, take a backup, then apply through your normal migration process, then run `notify pgrst, 'reload schema';`. Verify afterwards (read-only):
```
select column_name from information_schema.columns where table_name='dealer_teams' and column_name in ('employment_status','staff_number','business_email');
select count(*) from dealer_employment_events;
select dealer, staff_code, next_seq from dealer_staff_settings;
```
Order that is safe either way: the compatibility trigger keeps older backend code working against the new schema, and the new backend reports `employmentAvailable:false` against the old schema.
## 5. Staging only the intended files (review, then YOU commit)
```
git add backend\services\dealerEmployment.service.js backend\controllers\dealerPlatformController.js backend\routes\dealerPlatformRoutes.js backend\middleware\dealerOrgAccess.js backend\middleware\dealerWorkspace.js backend\services\dealerTeamRoles.service.js backend\server.js
git add supabase\migrations\20261123200000_dealer_employment_and_staff_identity.sql
git add src\pages\dealer\dashboard src\features\DealershipWorkspace src\services\dealerPlatformApi.js src\api\httpClient.ts
git add backend\tests ci\db-journeys src\__tests__ docs\handover\TEAM-EMPLOYMENT-20261123
git status --short
```
Do **not** stage `node_modules` (they are symlinks in the working copy) or journey `out\` folders. Commit/push/merge only when you decide; merging to `main` deploys to production.
