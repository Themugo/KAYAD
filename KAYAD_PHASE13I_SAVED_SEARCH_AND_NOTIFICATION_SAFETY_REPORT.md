# KAYAD Phase 13I — Saved-Search, Search Eligibility and Notification Safety

## Finding that drove the work
The 13H saved-search cron could never send (it wrote `saved_searches.last_notified_at`, a column that does not exist → every matching tick failed 42703) — **the 13H statement "the cron can now send" was wrong**. Once that is "fixed" naively it would have been unsafe: no on/off switch, matched against every new car (including pending/hidden/deleted), one user's disabled channel aborted the whole run, no durable run record.

## New design (no migration, no new preference model)
`backend/services/savedSearchNotificationJob.js` (job), `savedSearchMatching.js` (pure matcher), `savedSearchCron.js` (scheduler; schedules nothing when off).

Layered gate — ALL must pass before an external message can leave the process:
| # | gate | default |
|---|---|---|
| 1 | `SAVED_SEARCH_JOB_MODE` = `off` \| `dry_run` \| `enabled` (anything else = off) | **off** |
| 2 | `SAVED_SEARCH_EXTERNAL_DELIVERY=enabled` (exact value) else in-app only | **off** |
| 3 | `NODE_ENV=test` forces external delivery off | forced |
| 4 | existing `communication_preferences` consent (missing row blocks marketing), enforced by the gateway | existing |
| 5 | existing fail-closed `communication_event_controls` / `communication_channel_controls` (DB currently: saved-search email/sms/whatsapp = disabled) | existing |
| 6 | provider credentials (`providerConfigured`) | none here |
Plus: per-search consent `saved_searches.notify_on_new_match`; per-run caps (`SAVED_SEARCH_MAX_SEARCHES_PER_RUN` 1000, `SAVED_SEARCH_MAX_MESSAGES_PER_RUN` 200, `SAVED_SEARCH_LOOKBACK_HOURS` 24, clamped).
Behaviour: separate **processing** (matching, in-app ledger) from **external delivery**; each channel is attempted separately so one disabled channel never aborts another channel, search or user; in-app is sent first and is the dedupe record (`communication_deliveries`, key `ss:<searchId>:<hash of sorted car ids>`); a retry re-attempts only what is missing; recipients: the search owner only, never the listing's own seller, never banned/deactivated/suspended users; cross-instance lock fails **closed**; every run that planned or failed writes an `audit_logs` row ("Saved-search job run": mode, counts, errors). `dry_run` plans and audits but never calls the emitter and never writes the delivery ledger — the test mode that cannot send.
Eligibility: only `status=available`, not soft-deleted, within the look-back window — hidden, pending, draft, reserved, sold and deleted listings are never matched. Financial and auction notifications are untouched.

## Operator guide
Leave all variables unset in staging/production until the owner approves. Sequence: (1) `dry_run` → read the audit rows; (2) `enabled` (in-app only); (3) only after provider certification and enabling the communication controls: `SAVED_SEARCH_EXTERNAL_DELIVERY=enabled`. To stop: set mode `off` and restart (no jobs are scheduled while off). Rollback needs no database change.

## Evidence (fresh, this phase)
- `backend/tests/regression/phase13iSavedSearchJob.test.js` (+ `phase13hCarsLocationColumn.test.js`): part of the backend jest run, see test matrix.
- `runbooks/phase13i-20261026/db/phase13i_saved_search_job_db.mjs` → **25/25** on the real data layer (`validation-logs/phase13i/final/saved-search-db.log`): J0–J7 (fail-closed defaults, invalid mode, dry-run emits nothing / writes no ledger / audited, in-app only, eligibility, idempotent re-run, **concurrent runs deliver once**, double-based external attempts per channel, disabled-channel isolation, real gateway without provider credentials sends nothing, hidden listing never announced) and K1–K7 (**failed delivery then retry delivers once without re-sending**, recipient isolation, REAL consent rows with external flag on → nothing sent or queued, job never writes consent rows).
- No real email/SMS/WhatsApp could be sent: the harness refuses to run if `BREVO_API_KEY`/`AT_API_KEY`/`TWILIO_AUTH_TOKEN` is set; none was.
- Keyword search / saved-search matching exclude non-public listings: UI journeys KS1–KS4 (real search box, hostile inputs, no 5xx), HTTP matrix V3 leak scan, 13G search-alerts matrix (re-run, see test matrix). Buyer saved-search CRUD is unchanged (matrix C9/C10).

## Residual risk
Real provider delivery, quiet-hours handling and the production communication-control rows are **not** certified (no staging/provider). `last_notified_at` was deliberately NOT added; the ledger is the record.
