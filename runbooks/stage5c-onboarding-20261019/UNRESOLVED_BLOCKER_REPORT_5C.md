# Unresolved blocker report (Stage 5C)

| # | Blocker | Impact | Prerequisite / owner action |
|---|---|---|---|
| B1 | Live Brevo delivery unproven | cannot claim any user receives verification, reset, invitation or notice emails | Brevo key + verified sender/domain + authorization + owned mailbox; run a single send per template |
| B2 | Live SMS unproven | phone OTP delivery unproven | Africa's Talking production creds, sender ID, handset |
| B3 | Hosted schema unread | every hosted compatibility claim is unproven | run `HOSTED_READONLY_PREFLIGHT_5C.sql`; supply results |
| B4 | 5B owner migration not applied on hosted | owners cannot be activated | decision D1 (5B) + reviewed apply |
| B5 | 5C subscription RPC fix not applied on hosted | paid dealer activation likely fails on hosted PG | decision D5C-B, then apply with rollback ready |
| B6 | Communication control rows on hosted unknown | gateway may fail closed and send nothing | preflight §8; seed per migrations if missing |
| B7 | Owner activation of both real addresses | neither is active | see OWNER_ACTIVATION_READINESS_CHECKLIST_5C.md |
| B8 | `adminOnly` admits `ghost_checker` (O5C-01) | an inspector can reach ~236 admin routes | route-by-route review; decision D5C-A |
| B9 | Wholesale/trade listings have no column | feature returns 503 | schema decision |
| B10 | Deployed revision unknown | cannot confirm hosted runs this code | compare deployed commit with this ZIP |
