# Owner management guide (Admin → Owners)

Visible only to a verified, active owner. Ordinary administrators never see the tab and the API refuses them (403).

**Owners table** — every active owner with state: *Active · verified* or *Blocked — <reason>* (email not verified / account suspended or deactivated / account e-mail changed). "(you)" marks your row.
**Invite owner** — type the new owner's address, type it again, enter *your* password. The person receives a single-use link valid 24 h (max 7 days). Until they open it while signed in to a mailbox-verified account (or set a password) and accept, **they are not an owner**.
**Invitations** — pending/expired/accepted/revoked, expiry time, number of sends, who invited. *Resend* issues a fresh link and kills the old one (minimum wait between sends applies). *Revoke* needs a reason.
**Remove / Leave** — typed address + password + reason. Their access ends immediately everywhere (API, refresh sessions, live sockets). The system refuses to remove the **last usable owner**; the button is replaced by an explanation. You can leave only while another usable owner exists.
**Recover** — for a blocked owner whose identity you verified out of band; see the runbook §2.
**Who changed what** — the append-only history (latest 20, "Show all" for more). It never contains tokens or passwords.
**Notices** — every invitation, acceptance, removal and recovery sends a security notice (no link, no secret) to all active owners, and to the affected person.
**What owners cannot do through this page** — approve dealers/publish listings (separate policy), read private seller data, alter ledgers. Owner authority never bypasses ownership checks, escrow/ledger integrity or idempotency (see AUTHORIZATION_MATRIX_5B.md).
**Wrong password** — five wrong passwords in 15 minutes lock owner changes for that account for 15 minutes; this does not log you out.
