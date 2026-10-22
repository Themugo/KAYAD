# KAYAD — Full Project Production Package

This document describes a historical complete-source package. It is retained for context, not as an authorization to replace a working checkout.

## Included
- Frontend and backend source tree
- Database schema and migration documentation
- Existing governance, inspection, marketplace, dispute, communications, dealer, finance and integration domains
- Project configuration, documentation, tests and validation scripts

## Safety
Do not copy `.env` secrets into an archive. Populate environment variables locally or through the deployment provider. Do not blindly rerun destructive database resets or recreate existing production tables.

The legacy `FULL_PROJECT_COMMIT_PUSH.cmd` wrapper has been archived under `evidence/legacy-maintenance-scripts/root-phase-and-git-wrappers/` because it combines validation with Git mutation and is not a safe default entrypoint. Do not execute it. Run individual, reviewed validation commands from the current package scripts, inspect the resulting diff, and authorize commit/push actions separately.
