# Path Resolution Risks

- Alias/configuration rows: **2**
- Alias rows where target prefix did not directly exist: **0**

## Review notes

Alias targets can contain wildcards, inherited config, or tool-specific syntax. A simple path existence check is not authoritative. No aliases were changed.

No direct missing-prefix findings from compilerOptions.paths; bundler/runtime consistency still requires manual comparison.
