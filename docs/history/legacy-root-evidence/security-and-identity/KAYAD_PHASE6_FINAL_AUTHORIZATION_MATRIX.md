# KAYAD Phase 6 Final Authorization Matrix — Pending Runtime Evidence

No authenticated browser or API role tests were run in this environment. This matrix is a required test plan, not a claim of passing authorization.

| Identity class | Route access | UI action | Direct API/action | Status |
|---|---|---|---|---|
| Authorized owner/super-admin test identity | Verify permitted canonical admin routes | Verify actions allowed by current RBAC | Verify authorized request succeeds safely on test record | NOT RUN |
| Ordinary admin/staff role supported by the application | Verify only assigned routes | Verify only assigned controls | Verify unassigned actions are denied server-side | NOT RUN |
| Dealer role | Verify dealer routes only | No admin-only controls/actions | Direct admin API access must fail closed | NOT RUN |
| Unauthenticated session | Protected admin route must redirect/deny per existing contract | No protected actions | Protected API request must be denied | NOT RUN |
| Expired/invalid session | Existing re-authentication behavior | No stale privileged controls | Requests must be rejected | NOT RUN |

Use existing role definitions and safe staging identities. Do not grant permissions or change account records to force a test result. Capture status codes and sanitized evidence; never include credentials or tokens.
