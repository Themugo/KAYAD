# Phase 18 Handover and Rollback

## Handover
The Phase 18 checkpoint continues from the verified Phase 17 ZIP. No operational scripts were executed and no root files were moved, renamed, or deleted. All root files are classified; script decisions and blockers are in the CSV registers.

## Rollback
The original Phase 17 ZIP is the immutable recovery point. To roll back, discard the Phase 18 extracted working copy and re-extract the verified Phase 17 archive. Do not copy Phase 18 evidence into the Phase 17 archive.

## Required follow-up
A verified repository owner must confirm which phase apply scripts are still invoked, provide the intended checkout/worktree and invocation instructions, and authorize any path changes. After that, safely update known references and re-run verification. Do not run the scripts as a discovery method.
