# Staging and M-Pesa sandbox prerequisites (names only, no values)
Environment variables to confirm in the staging secret store: MPESA_ENV (sandbox), MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_WEBHOOK_SECRET, MPESA_EXTRA_IPS, KAYAD_AUCTION_COMMITMENT_PAYBILL. Also platform_config.daraja if used.
Safe verification procedure (never print secrets):
1. Confirm each name is set (presence/length check only, e.g. a boolean report).
2. Confirm MPESA_ENV=sandbox in staging and that MPESA_SKIP_IP_CHECK is NOT set.
3. Confirm the shortcode in the Safaricom portal belongs to the intended business account (human check by the account owner).
4. Confirm the callback URL is HTTPS, reachable, and that source IPs match Daraja's published list or MPESA_EXTRA_IPS.
5. Run one Daraja sandbox STK Push with the sandbox test number; verify one success callback, one receipt, no duplicate on resend.
6. Re-run the account-security and payment scripts from runbooks/phase14-9-20261026/localdb against staging PostgREST with test accounts.
7. Exercise the activated dealer auction-setup endpoints as a dealer in staging.
8. Run the DB migrations preflight for any trigger proposed in report 07.
