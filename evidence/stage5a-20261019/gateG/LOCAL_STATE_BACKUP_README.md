# Stage 5A local-state backup (preserved, NOT part of the portable ZIP)
Both files are generated SQLite state created by the upload store (backend/services/sqlUploadStore.js) when tests/probes ran. Neither is authoritative user data; the Windows tree's own backend/data/uploads.sqlite (if any) was not reachable and is NOT replaced by either.

| file | bytes | sha256 | rows | disposition |
|---|---|---|---|---|
| work-tree_uploads.sqlite | 20480 | ba3931519f08909bb61083773fdb5cf8f0c2e9bec63cf639d4347080418fe6c6 | 1 | one legacy-import row (70-byte 1x1 PNG, folder legacy) from my own isolated-stack probe; the PNG itself was removed from the tree; kept as evidence, excluded from ZIP |
| extracted-copy-test-run_uploads.sqlite | 20480 | 795dd8ea6868dede7eb000d4a44e5cbbb57babade9927120dfc8e70fcfd9b571 | 0 | created empty by the offline suites on the extracted copy; excluded |

Reason for exclusion: generated runtime state (binary, changes on every test run, would make the archive non-deterministic). Working copy left in place. backend/data/uploads.json restored to baseline `[]` (included in ZIP).
