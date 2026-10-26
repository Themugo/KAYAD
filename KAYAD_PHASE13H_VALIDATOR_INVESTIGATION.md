# KAYAD Phase 13H — Historical Validator Investigation

Both failures reproduced on the Phase 13F tree, the Phase 13G foundation and the Phase 13H tree (logs in `validation-logs/phase13h/validators/`). Neither is caused by 13G/13H work.

## `validate:super-admin-phase1-navigation` — obsolete expectation, corrected
- Failing check: "All 29 established sidebar destinations remain present exactly once".
- Cause: `AdminSidebar.tsx` has **30** destinations. All 29 expected ones are present; the extra is `/admin/private-seller-applications`, added by the approved Phase 13E private-seller review work. (Same file in the 13E baseline already contains it.)
- Correction: the expected list gained that one path (with a comment) and the label became "All 30 established sidebar destinations (29 original + approved private-seller review)…". The match stays exact (`length`, `Set` size, and every expected path included).
- Protection not weakened — demonstrated by mutation on a scratch copy: removing `/admin/webhoist` from the sidebar → check FAILS (exit 1); adding an unplanned `/admin/zz-unplanned` → check FAILS (exit 1). Result after the update on the real tree: 12/12 PASS.

## `validate:stage5f7-private-auction-contract` — environment/package dependent, NOT changed
- Failure: `ENOENT … KAYAD_STAGE5F7_PHASE_A_CONTRACT_FREEZE.md`. The validator reads three planning documents at the project root (`…_PHASE_A_CONTRACT_FREEZE.md`, `…_THREAT_MODEL.md`, `…_API_AUTHORIZATION_MATRIX.md`) and asserts specific contract sentences in them (physical custody mandatory, seller pays custody charges, `vehicle_custody` capability, …). These documents are in no package available here (none of the 13E/13F/13G trees), so the check cannot run.
- Not corrected: recreating the documents would fabricate evidence for a protected private-auction contract, and deleting the check would remove protection. The related executable gate `validate:stage5f10-private-seller-gate` passes.
- Owner action: supply the three original documents (or confirm the validator is retired). Until then this validator is "cannot be evaluated", not "passed".
