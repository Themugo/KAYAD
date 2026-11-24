# Windows CMD (nothing has been committed, pushed, merged or deployed for you)
Inspect the ZIP and compare with your repository (extract into a NEW folder, never over the project):
```cmd
cd /d C:\Users\hp\Desktop\KAYARD-KE
git status
git branch --show-current
certutil -hashfile "%USERPROFILE%\Downloads\KAYARD-KE-full-project-convergence-20261123.zip" SHA256
rmdir /s /q C:\Users\hp\Desktop\KAYARD-KE-convergence-check 2>nul
mkdir C:\Users\hp\Desktop\KAYARD-KE-convergence-check
tar -xf "%USERPROFILE%\Downloads\KAYARD-KE-full-project-convergence-20261123.zip" -C C:\Users\hp\Desktop\KAYARD-KE-convergence-check
dir C:\Users\hp\Desktop\KAYARD-KE-convergence-check\docs\handover\CONVERGENCE-20261123
robocopy C:\Users\hp\Desktop\KAYARD-KE-convergence-check C:\Users\hp\Desktop\KAYARD-KE /L /E /XD node_modules .git dist coverage /XF .env .env.* /NJH /NJS /NDL
```
`/L` only LISTS differences. To apply, run the same command without `/L` (robocopy only adds and overwrites; it never deletes your files), then review:
```cmd
git status
git diff --stat
git diff
```
Run the relevant tests locally (frontend, then backend alone):
```cmd
npm ci
npx tsc --noEmit -p .
npx vitest run
npm run build
cd backend
npm ci
node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2
cd ..
```
Stage the intended files and review the staged diff:
```cmd
git checkout -b release/convergence-20261123
git add -A
git diff --cached --stat
git diff --cached --name-only | findstr /i /r "\.env$ \.env\. secret password token"
```
The last command must print nothing. If it prints a file, run `git restore --staged <file>` and stop.

Only when you separately decide to commit and push:
```cmd
git commit -m "Dealer Command Centre convergence: collapsible sidebar, bulk inventory actions, temporary duties" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin release/convergence-20261123
```
Then apply `supabase\migrations\20261123220000_dealer_temporary_duties.sql` (and `20261123210000_lead_create_find_before_insert.sql` if not yet applied) using your normal migration process, as described in `docs\handover\CONVERGENCE-20261123\OWNER-SQL.md`.
