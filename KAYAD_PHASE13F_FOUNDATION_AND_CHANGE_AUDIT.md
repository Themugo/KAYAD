# Foundation and change audit

- Foundation: `KAYAD-PHASE13E-UNIFIED-PERSONAL-ACCOUNT-COMPLETION-20261025.zip`, SHA-256 `e76dd957248fa68cffb615f537851fba67d1236e041e5c7664a1472c377d23fc` — verified before extraction.
- Runtime: Node v22.23.4; `npm ci` for root and backend (logs: `validation-logs/phase13f/npm-ci-*.log`).
- Method: a pristine copy of the foundation was kept at a separate path; every baseline number below comes from that pristine copy, not from the edited tree.
- Invalid baselines discarded and kept as `INVALID-*` / `*-WRONG-INVOCATION-*` logs: a backend-only extraction (tests read repo-root files), and a jest run without `--experimental-vm-modules`. The valid baselines were re-run on a full pristine extraction.
- Identity model confirmed in source: one `users.id` (role `user`); seller state in `private_seller_capabilities`; no dealer rows created for personal sellers; `cars.dealer_id` → `users.id` is the owner.
- Source diff vs foundation: see `KAYAD_PHASE13F_SOURCE_CHANGE_LEDGER.csv` (exact list). No protected financial, Super Admin authentication, or public marketplace page files appear in it.
