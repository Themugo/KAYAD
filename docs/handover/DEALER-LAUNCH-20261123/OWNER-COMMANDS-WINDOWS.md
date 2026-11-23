# Windows CMD handover (nothing here has been run for you; nothing is committed or pushed)
Replace the ZIP path with where you saved the download. Extract into a NEW folder, never over your project.

```cmd
cd /d C:\Users\hp\Desktop\KAYARD-KE
git status
git branch --show-current
git fetch origin
git log --oneline -3

certutil -hashfile "%USERPROFILE%\Downloads\KAYARD-KE-full-project-dealer-launch-ready-20261123.zip" SHA256
mkdir C:\Users\hp\Desktop\KAYARD-KE-dealer-launch-check
tar -xf "%USERPROFILE%\Downloads\KAYARD-KE-full-project-dealer-launch-ready-20261123.zip" -C C:\Users\hp\Desktop\KAYARD-KE-dealer-launch-check

fc /b C:\Users\hp\Desktop\KAYARD-KE\backend\controllers\dealerPlatformController.js C:\Users\hp\Desktop\KAYARD-KE-dealer-launch-check\backend\controllers\dealerPlatformController.js
robocopy C:\Users\hp\Desktop\KAYARD-KE-dealer-launch-check C:\Users\hp\Desktop\KAYARD-KE /L /E /XD node_modules .git dist /NJH /NJS /NDL
```
The `/L` robocopy run only LISTS differences. To apply, copy only the files in CHANGED-FILES.md, then:
```cmd
git status
git diff --stat
git add backend\config\featureFreezePolicy.js backend\controllers\chatController.js backend\controllers\dealerPlatformController.js backend\routes\adminRoutes.js backend\routes\dealerPlatformRoutes.js backend\services\dealerApproval.service.js backend\tests\regression\dealerApprovalReleasesHeldListings.test.js backend\tests\regression\dealerLaunchFlowsContracts.test.js backend\tests\regression\featureFreezeEnforcement.test.js backend\tests\regression\phase13dDealerIsolation.test.js ci\browser\dealer-launch.mjs ci\db-journeys\23_dealer_launch_flows.mjs ci\db-journeys\run.sh src\__tests__\pages\dealer\DealerLaunchUi.test.tsx src\__tests__\pages\dealer\DealerWorkspaceNavigation.test.tsx src\pages\dealer\dashboard\CommandCentrePanel.tsx src\pages\dealer\dashboard\DealerDashboard.tsx src\pages\dealer\dashboard\LeadConversation.tsx src\pages\dealer\dashboard\VehicleRequestsPanel.tsx src\services\dealerPlatformApi.js src\styles\dark-theme.generated.css supabase\migrations\20261123210000_lead_create_find_before_insert.sql docs\handover\DEALER-LAUNCH-20261123
git diff --cached --stat
git diff --cached
```
Stop there and review the staged diff. Commit and push only when you decide to (you asked to be the one to do it); then apply the migration as described in OWNER-SQL.md.
