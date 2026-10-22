# Relocation Dependency Checklist

Before any future move, check every applicable item:

- [ ] User approval explicitly covers the exact source and destination paths.
- [ ] Current path exists in the verified checkpoint.
- [ ] Original SHA-256 and file mode/symlink behavior recorded.
- [ ] Static imports, re-exports, aliases, and dynamic imports checked.
- [ ] String-based filesystem reads/writes and glob patterns checked.
- [ ] Package scripts and nested shell/PowerShell invocations checked.
- [ ] Test fixtures, validators, and test working directories checked.
- [ ] CI/CD and hosting configuration checked.
- [ ] Framework conventions and route discovery checked.
- [ ] Runtime entry points and start/build working directories checked.
- [ ] Migration and policy discovery patterns checked where applicable.
- [ ] Documentation, runbooks, local batch files, and human workflows checked.
- [ ] Historical provenance and authoritative checkpoint status confirmed.
- [ ] Exact reference updates listed before editing.
- [ ] Isolated verification environment available.
- [ ] Rollback snapshot and trigger criteria defined.
- [ ] Post-move inventory/hash/reference checks defined.
- [ ] Relevant build/test gates defined and results captured.
- [ ] Full-project ZIP and SHA-256 sidecar planned.

Any unchecked applicable item blocks the move. Phase 3 itself performs no moves.
