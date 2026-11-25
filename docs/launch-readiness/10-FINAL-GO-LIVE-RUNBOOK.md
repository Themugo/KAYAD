# 10 — Final go-live runbook (owner actions; nothing here has been executed)
## A. Review locally (Windows CMD)
```
cd C:\Users\hp\Desktop\KAYARD-KE
git status
git checkout -b feat/launch-readiness-storefront
```
Unzip the delivered archive into a separate folder, compare, then copy the folder contents over the repo (do not replace the folder; keep `.git`). `npm install` in the root and in `backend`, then `npm run typecheck` and `npm test`.
## B. Commit (only when you are satisfied; not done for you)
```
git add -A
git commit -m "Launch readiness: public dealer storefront, session-aware optionalAuth, targeted notifications" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01EjE5Xyjb3pT2FDebvziRkS"
git push -u origin feat/launch-readiness-storefront
```
Open a pull request into `main`; merge only after review.
## C. Before inviting the first dealer (in order)
1. **Backup** the hosted database (Supabase backup/PITR confirmed).
2. Review then apply `20261125090000_dealer_public_storefront.sql`; run `NOTIFY pgrst, 'reload schema'`. Decide separately about the suspension/reinstatement request migrations before using those admin flows.
3. Set/verify API environment: Brevo, Cloudinary, Redis, `FRONTEND_URL`, CORS, cookie domain; deploy API then web.
4. In Admin → Settings → Onboarding choose mandatory dealer documents.
5. In the admin control set `isAuctionActive=false` and `isPaymentsActive=false` until those phases open; decide on hiding deferred navigation.
6. Smoke test with authorised test addresses only: register a personal account → receive and click the real verification e-mail → log in; register a dealer test business → apply → approve as superadmin → upload logo → list a vehicle with a photo → open `/showroom/<id>` in a private window → enquire from the personal account → check the bell for owner and a staff member with lead permission; invite a staff test address and confirm the e-mail arrives.
7. Only then onboard the first real dealer. Keep the superadmin session available.
## D. Rollback
Revert the pull request; the migration is additive (two nullable columns) and can stay. Disable new registrations with the existing registrations freeze if a problem appears.
## E. After go-live
Watch the delivery ledger for `failed`/dead-letter rows, the bell/unread counts for a test account, and audit records of every approval.
