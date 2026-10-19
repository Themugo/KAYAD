# Owner decision register — Stage 5B

| # | Decision | Recommendation | Needed before | Status |
|---|---|---|---|---|
| D1 | Approve and apply migration `20261019120000_stage5b_owner_governance` to the hosted database (after preflight) | Approve, in one sitting with both owners reachable (see rollback plan §Application order) | Any hosted owner provisioning | **OPEN — not approved, not applied** |
| D2 | Deploy the Stage 5B code (safe before D1: legacy mode) | Approve with the next release | — | OPEN |
| D3 | Confirm that `kayadautomotives@gmail.com` and `jimmythemugo@gmail.com` are the two initial owners and that **both mailboxes are verified accounts** in the hosted app | Confirm | `owner:bootstrap --apply` | OPEN |
| D4 | Brevo production credentials for live delivery of invitations/notices (test mailboxes only for the first live test) | Provide / confirm | Live e-mail test | OPEN (live tests BLOCKED here) |
| D5 | Invitation lifetime (default 24 h, max 168 h) and resend cooldown (default 60 s) | Keep defaults | — | Default in force |
| D6 | Who holds production service-role access for the emergency CLI, and where `OWNER_EMERGENCY_RECOVERY_UNTIL` may be set | Name two people; record in the incident process | Go-live | OPEN |
| D7 | Legacy `seed.js` owner provisioning is blocked in production unless `SEED_ALLOW_UNVERIFIED_OWNER_PROVISIONING=I_ACCEPT_NO_MAILBOX_PROOF` | Keep blocked | — | Implemented |
| D8 | Reconcile the Windows working tree (five files reported missing in earlier stages) | Run the reconciliation script on the Windows machine | Commit of 5B | OPEN — the Windows tree was **not reachable** in this stage |

## Policy decisions recorded at closure (implemented; semantics that were tightened or clarified)
| # | Decision | Effect | Status |
|---|---|---|---|
| D9 | **Owner predicate is identity-strict in database mode**: an owner needs a user id equal to the bound membership id, and is refused if the account is banned, deactivated or not mailbox-verified *at request time* (not only at the next registry refresh) | An id-less object, or a banned/deactivated/unverified account, is never an owner even inside the 5 s cache window | Implemented (CL-4) |
| D10 | **Registry fails closed once the store has been seen.** A "function not found" after a successful read is an unreadable store, not "not installed". Legacy mode is only for a process that never saw the store | No silent return to the env list after rollback/drop/schema-cache error; operator restarts or sets `OWNER_STORE_MODE=legacy` deliberately | Implemented (CL-3) |
| D11 | **A membership change invalidates the registry with a taint**: a snapshot read that started before the change is discarded, and the pre-change snapshot may not be served as "stale grace" after a failed re-read | A revoked owner cannot be revived by an in-flight read or a transient DB error. Invitation-only changes keep the grace (nothing was revoked) | Implemented (CL-1, CL-2) |
| D12 | **Owner accounts stay protected in error mode.** Protection of an owner account (ban/delete/role edit/report handling) uses designated ∪ snapshot ∪ active members, independent of privilege | A store outage never lowers protection of owner accounts | Implemented (CL-5) |
| D13 | **Reserved owner addresses cannot be created or verified without mailbox proof on any path** — added admin staff creation (`POST /admin/staff` → 409) and inspector-application approval (→ 409) to public registration | Closes two routes that set `emailVerified=true` for an owner address without proof | Implemented (CL-6) |
| D14 | **Recovery is resumable**: a recovery whose second step failed (access ended, invitation not issued) is detected and finished by running Recover again; the failed step is logged and reported `OWNER_RECOVERY_INCOMPLETE` (503, retry) | No owner can be left revoked with no way back except the emergency CLI | Implemented (CL-7, C5) |
| D15 | Ex-owner user rows cannot be hard-deleted while a membership row exists (`ON DELETE RESTRICT`) | Deliberate: preserves the audit trail. Deactivate/ban instead. Operators needing erasure must follow a reviewed procedure | Documented |
| D16 | `WEBHOIST_EMAIL` compares the exact normalised address. Gmail dot/plus aliases are different addresses and are **not** treated as the designated identity | Operators must designate the canonical address that owns the mailbox | Documented |
| D17 | Step-up lockout (5 wrong passwords / 15 min) is held **per application instance** | With several instances the effective limit is 5 × instances. Move to a shared store before scaling out, if that matters | Known limitation (see blockers) |

