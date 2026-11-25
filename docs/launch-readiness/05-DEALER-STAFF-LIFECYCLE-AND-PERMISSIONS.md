# 05 — Dealer staff lifecycle and permissions
| Capability | Result | Evidence |
|---|---|---|
| Owner invites by e-mail with a role; status visible; resend; revoke; expiry | PASS | journeys 17, 21 |
| Own identity: invitee must be a personal account with the invited e-mail; token hashed, expiring, single use; cannot accept for another e-mail or dealership | PASS | 17, 21, 22 |
| Concurrent acceptances → distinct monotonic staff numbers | PASS (fresh stack) | 22 |
| New staff get minimum access (Basic Staff locked) | PASS | 21, r2 tests |
| Owner edits roles (all but Basic Staff), resets built-ins, per-person access | PASS | r2 tests (earlier) + journey 29 (today); journey 14 earlier, not re-run |
| Backend authorisation, not buttons: staff without lead permission refused leads (403); without team permission refused invites (403); another dealer cannot read leads, edit vehicles, list staff or edit the profile | PASS | 32, 37 |
| Suspend/revoke removes access immediately; records and audit kept | PASS | 22, 37 |
| Staff notified of role/access/suspension/restoration/ending | PASS | 36, 22 |
| Real invitation e-mail receipt | NOT VERIFIED (stub provider) | – |
Note: journeys 22/23/29/30 passed alone on a fresh stack; run back-to-back in one stack they hit HTTP 429 from the accept-endpoint rate limiter (harness artefact, not a product defect). Run them in separate stacks.
