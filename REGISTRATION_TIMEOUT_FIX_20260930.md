# KAYAD Registration Timeout Fix — 2026-09-30

## Root cause

The registration controller waited synchronously for external email delivery before issuing
the authentication response. The canonical Brevo adapter can wait up to 30 seconds per
attempt and retry, while the browser HTTP transport also has a 30-second timeout.

This made the onboarding screen surface:

`timeout of 30000ms exceeded`

even though the account-creation path itself could already have completed.

## Fix

Registration now:

1. Validates and persists the user identity.
2. Persists the credential/auth record.
3. Generates the verification token.
4. Dispatches verification email delivery without awaiting the external provider.
5. Dispatches the welcome email without awaiting the external provider.
6. Issues the httpOnly access/refresh cookies and returns the registration response immediately.

The email verification gate remains intact: when deployment policy requires verification,
an unverified user still cannot sign in. Verification email delivery failures are logged
and the existing resend-verification route remains available.

## Regression protection

The registration source validation gate now verifies that both registration emails are
non-blocking and prevents an awaited external delivery from being reintroduced.

Validation result:

`14/14 PASS`

JavaScript syntax checks also pass for the modified controller, validation script and
registration contract test.
