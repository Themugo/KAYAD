# Rollback

Nothing hosted was changed, so rollback is source-only.
- Keep using the original ZIP `KAYAD-MAINTENANCE-SCOPES-20261027-FINAL-VERIFIED.zip` (SHA-256 `1142a60d12c449753536c9ffb620ea58ff3a0263496be3be0b901f3cda73c28d`); extract it over a clean tree to return to the previous state.
- Or revert just these files to their previous content: `AdminLayout.tsx`, `AdminSidebar.tsx`, `AuthContext.tsx`, `AdminView.tsx`, `admin-command-centre.css`, `kayad-admin-shell.css`, `adminCommandCentre.test.tsx`, and delete the new files listed in the change ledger.
- If already committed by you later: `git revert <commit>` (no schema, env or data dependency).
