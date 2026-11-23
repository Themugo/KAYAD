# Known limitations
* No per-listing approval, "changes requested" or rejection states (owner policy; DB status set unchanged).
* Dashboard: no sales-performance chart, no "dealership at a glance" strip, no hero photo, search covers own vehicles only (mock-up differences).
* A buyer's `message` sent while starting a chat is not stored by `POST /chat`; the app must send it as a message (existing behaviour, not changed).
* Vehicle requests have no dedicated admin screen; administrators use the support queue. Request subjects are prefixed `[Vehicle request]`.
* Historic duplicate leads remain until the owner decides on cleanup (OWNER-SQL.md block 2).
* Replying to a lead is available only for chat-sourced leads.
* Pre-existing validator failures (10) are identical on main and are not addressed.
* E-mail delivery, hosted invitation flow, PR 266 status, axe audit: NOT VERIFIED / NOT RUN.
* Test runs left `backend/data/uploads.sqlite`, `backend/uploads/` and `logs/` in the working tree; they are excluded from the ZIP and should not be committed.
