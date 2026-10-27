# 04 ESLint comparison
| Run | eslint src | eslint . |
|---|---|---|
| 14.4 baseline | - | 2,291 errors |
| 14.5 (before its fix) | 0 errors | 2,313 errors |
| 14.6 | exit 0: 0 errors / 1,565 warnings | exit 1: 2,286 errors / 1,565 warnings (3,851 problems) |
Locations (14.6): by top folder: scripts 2,060, runbooks 130, evidence 84, reports 12 (total 2286); none in src or backend source.
Classification: LEGACY DEBT plus CONFIG GAP. 2,109 of the errors are no-undef (Node globals such as process/console/Buffer in .mjs/.cjs tooling that the flat config does not declare), 98 no-unused-vars, 71 no-useless-escape, rest minor. They are in operational scripts and historical evidence runbooks, not in application source. No actionable application defect. Not mass-fixed (out of scope, would be mass reformatting); rules were not weakened.
14.6 actions: the 14.5 files that introduced 22 errors were already fixed; this phase's new/modified files lint clean (0 errors): the 14.6 runbooks, validate-v14-live-certification-contract.mjs (5 pre-existing errors fixed: global declaration and an unused read kept as an existence check), dashboard sources and tests. Net: 2,291 -> 2,286.
Recommended: add a Node-globals override for scripts/**, runbooks/**, evidence/** in a dedicated config phase.
