# Unresolved blockers — Stage 5B (certified release)

None of these is a local defect; each needs an authorisation or access this stage did not have.

| # | Blocker | Needed from | Effect if ignored |
|---|---|---|---|
| B1 | Migration candidate **not approved, not applied** (D1) | Owner decision | No owner governance in hosted; app stays in legacy mode (safe) |
| B2 | Hosted schema prerequisites (4 Gate C gaps) unverified/unapplied | Separate authorised read-only check, then authorised application | Candidate fails to apply (fails safe) |
| B3 | Neither designated address is known to exist, be verified or be controlled by its intended owner in the hosted app (D3) | Jimmy Mugo / mailbox holders | `owner:bootstrap --apply` refuses or leaves invitations pending |
| B4 | Live e-mail (Brevo production credentials, real mailboxes) **BLOCKED** (D4); only provider stub tested | Credentials + authorised test mailboxes | Invitation delivery unproven in production |
| B5 | Emergency recovery custody (D6): who holds service-role access | Owner decision | No named break-glass operators |
| B6 | Windows working tree **not reachable**; five files reported missing in earlier stages not reconciled (D8) | Run reconciliation on the Windows machine | Commit of 5B could miss files |
| B7 | Step-up lockout per instance (D17) | Engineering decision before horizontal scale-out | Weaker brute-force limit with several instances |
| B8 | No production-readiness claim: all evidence is local (M/R/P) | Hosted rehearsal on a staging copy | — |
