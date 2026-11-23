# Windows CMD (nothing has been committed or pushed for you)
```cmd
cd /d C:\Users\hp\Desktop\KAYARD-KE
git status
git branch --show-current
certutil -hashfile "%USERPROFILE%\Downloads\KAYARD-KE-full-project-scope-correction-20261123.zip" SHA256
mkdir C:\Users\hp\Desktop\KAYARD-KE-scope-check
tar -xf "%USERPROFILE%\Downloads\KAYARD-KE-full-project-scope-correction-20261123.zip" -C C:\Users\hp\Desktop\KAYARD-KE-scope-check
robocopy C:\Users\hp\Desktop\KAYARD-KE-scope-check C:\Users\hp\Desktop\KAYARD-KE /L /E /XD node_modules .git dist /NJH /NJS /NDL
```
`/L` only lists differences. Copy the files named in the changed-files manifest, then review:
```cmd
git status
git diff --stat
git add src\pages\dealer\dashboard\DealerDashboard.tsx src\pages\dealer\dashboard\CommandCentrePanel.tsx src\__tests__\pages\dealer\DealerLaunchUi.test.tsx ci\browser\dealer-launch.mjs ci\db-journeys\24_scope_correction.mjs ci\db-journeys\run.sh docs\handover\SCOPE-CORRECTION-20261123
git diff --cached
```
Only when you separately decide to commit and push:
```cmd
git commit -m "Scope correction: dealer listings are not KAYARD-reviewed; add regression journey 24"
git push origin HEAD
```
