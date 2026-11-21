# Stage 5E.1 — Gitleaks finding classification and remediation

## 1. Finding
| Field | Value |
|---|---|
| Workflow / job | `.github/workflows/security.yml` → "Secret Scan (gitleaks)" — `gitleaks/gitleaks-action@v2`, `GITLEAKS_CONFIG=.gitleaks.toml` |
| Commit | `0a3d10bb` (Stage 5E verification-recovery package) |
| Rule | `generic-api-key` (a repository-defined rule in `.gitleaks.toml`) |
| File : line | `backend/tests/regression/stage5eResendCommitOnProviderAcceptance.test.js` : 16 |
| Flagged text (shape only) | `process.env.BREVO_API_KEY = "<provider prefix>-<words>"` — an assignment to a variable named `…API_KEY` of a 16+ character literal |

## 2. Classification — **synthetic test fixture (not a credential)**
| Question | Evidence | Verdict |
|---|---|---|
| Authored by whom, for what | Written by the assistant in Stage 5E.2 as the mocked-gateway test's placeholder value so `BREVO_API_KEY` is "present"; the test only needs a non-empty opaque string | fixture |
| Does it have the shape of a real Brevo key? | It was `xkeysib-` + three English words in capitals (`TESTONLY-NOT-A-REAL-KEY`). A real v3 key has a long random body. The prefix is what made the line look like a provider key | resembles, is not |
| Could it ever authenticate? | The tests stub `fetch`; the string was never sent anywhere. Brevo keys are issued by Brevo, not chosen | no |
| Any real-shaped key anywhere in Git history? | `git log --all -G'xkeysib-[A-Za-z0-9]{40,}'` over **all 1,181 commits / all refs** → **0 commits** | none |
| Where did the literal appear? | `git log -S` → 3 commits (`3154675d`, `dbdc4a1b`: Stage 5A test line 21; `0a3d10bb`: Stage 5E test line 16) | 2 files |
| Did a real secret get copied into it? | No — the value is the literal fixture text in both places | no |
**Conclusion: SYNTHETIC. No credential was exposed, so no revocation/rotation is indicated, and no history rewrite is proposed or performed.**

## 3. Why the scanner fired
The repository rule `generic-api-key` in `.gitleaks.toml` is a case-insensitive pattern: a variable name containing "api key", "secret key", "access key", "private key" or "auth token" (underscore/hyphen/none between the words), then `=` or `:`, optional quotes, then 16 or more letters/digits/hyphens/underscores. The Brevo assignment satisfies it purely by *name + length*; the provider prefix is irrelevant to the rule.

## 4. Remediation (narrow, no suppression)
| Change | Detail |
|---|---|
| Fixture replaced in the flagged file **and the identical one in the Stage 5A test** | `const FIXTURE = "fixture-not-a-credential-0001"; process.env.BREVO_API_KEY = FIXTURE;` — no provider prefix; the right-hand side is a short identifier, which the rule does not match. Every assertion is unchanged (they only compare the value with itself / assert absence from logs) |
| Allow-list | **None added.** `.gitleaks.toml` is byte-identical to the one on `main` |
| New tests written this stage | use the same pattern (`FIXTURE`, or a runtime-built value) so they do not re-trigger the rule |

## 5. Verification (Gitleaks **v8.18.4** Linux binary, repository `.gitleaks.toml`, `--redact`; values never printed)
| Check | Result |
|---|---|
| Reproduce on the pushed tree (`--no-git`) | flags line 16 **and** Stage 5A line 21 (+ 14 older findings elsewhere) → 16 |
| Corrected working tree (`--no-git`) | 14 findings; **both fixture findings gone**; remaining 14 are older, outside this change (see §6) |
| Git-mode, "before" commit (old fixture) | **2 findings** (reproduces what CI saw) |
| Git-mode, "after" commit (this change) | **no leaks found** |
| Real secrets still detected? | A canary file `BREVO_API_KEY = "xkeysib-<48 random hex>"` (generated at run time, deleted afterwards) **is detected** by the same config (`generic-api-key`) → the fix did not blind the scanner |
| Tests | the two edited test files: 26/26 pass |
*Limit:* CI uses the `gitleaks-action` bundled engine (its version was not observable here), and a hosted run was not reproduced. Local result ≠ CI result until CI re-runs on the pushed fix.

## 6. Pre-existing findings that are NOT fixed here (decision for the owner)
A full-history scan of `main` (83 matches, repository config) shows CI evidently inspects only the pushed range, because older matches have not failed past runs. Heuristic triage, **values never printed**:
| Class | Count | Triage |
|---|---|---|
| `generic-api-key`, `twilio-account-sid`, `aws-access-key` | 46 | 38 placeholders / env references / empty values (e.g. `CLOUDINARY_API_KEY=`, `TWILIO_AUTH_TOKEN=` with empty values, the vendor's published documentation-example access key); 8 flagged for eyes-on (docs, a Helm values file, a setup script that reads a variable) |
| `database-connection-string` | 33 | 17 local/placeholder; 16 are a legacy Mongo URL in `SCALABILITY_ENVIRONMENT_VARIABLES.md` with the passwords literally `password`, `staging-password`, `strong-password` |
| `jwt-token` | 4 | all decode to role **`anon`** (Supabase public browser key, `VITE_SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY`), which is public by design |
**No genuine credential was identified.** This is a heuristic triage, not a proof. Recommended (separate, owner-approved): review the 8 flagged lines; decide whether to add a *narrow, path-scoped* allowlist for documentation placeholders; consider a committed `gitleaks` baseline.
