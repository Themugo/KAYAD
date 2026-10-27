# Known gaps and open decisions
1. No self-service account deletion exists (not invented). Product must decide whether to build it; it would need a dealership transfer/closure workflow first.
2. No dealership transfer, succession or closure workflow: owner deletion is blocked.
3. Application-level deletion check is not atomic; recommended DB BEFORE DELETE trigger (needs authorization, schema change).
4. Customer payments go to the platform shortcode, not directly to dealers (see report 04). Business must confirm the model.
5. Dealer-configured deposit destination (`recipientAccount`) and `dealers.payment_details` are not used by money movement; protected-boundary change authorization required to wire or remove them.
6. Amount-mismatch and late-success callbacks leave provider/platform states divergent; needs a reconciliation procedure or authorized state-machine change.
7. Reserved listings can still be purchased; decide the rule.
8. Editing businessName after approval does not trigger re-verification.
9. Newly activated dealer auction-setup endpoints (finding 1 in report 03) need staging validation and sign-off.
10. Step-up uses the account password; accounts without a password credential (if any social-login path exists) cannot change the phone via these endpoints - verify in staging.
11. Receiving shortcode/destination was NOT verified (no authorized environment).
