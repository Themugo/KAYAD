# Consumer Discovery Report

## Scope and method
Scanned 6186 archive entries readable as UTF-8 text, limited to 2 MiB per file and excluding files whose first 8 KiB contain NUL bytes. Skipped 7 oversized files and 159 binary-like files. Searched exact candidate filenames line-by-line and classified matches provisionally by path and file type. The archive is under `kayad-phase6-final-completion-work-20261022/`.

## Findings
All seven candidate basenames are present at the root. Exact filename occurrences were found across the repository text corpus. These are static text matches, not proof that each consumer is active. Candidate-specific counts are in `PHASE_08_CANDIDATE_EVIDENCE_REGISTER.csv`; individual references are in `PHASE_08_CONSUMER_CLASSIFICATION.csv`.

`KAYAD_SUPPORT_TEST_MATRIX.md` also appears as `kayad-phase6-final-completion-work-20261022/docs/domains/KAYAD_SUPPORT_TEST_MATRIX.md`. This requires byte-level comparison and provenance review; it must not be treated as a duplicate solely based on basename.

## Limits
No hosted CI/CD settings, hosting-provider settings, developer-local scripts, human workflows outside the archive, or runtime-generated paths were inspected. No network calls, production access, or secret access occurred. Candidate statuses remain blocked pending the specific evidence requests in `PHASE_08_EXTERNAL_EVIDENCE_REQUESTS.csv`.
