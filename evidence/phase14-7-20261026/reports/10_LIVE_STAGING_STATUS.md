# 10 Live staging (Order 11): BLOCKED
Re-checked: no staging origin, Supabase variables, backend .env, or test accounts are present; outbound access is limited to package registries. Nothing was guessed and no production system was contacted.
## Staging checklist (variable NAMES only)
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, JWT_SECRET, FRONTEND_URL / API origin, email provider credentials (as named in the communications provider validator), SMS provider credentials, CSRF/cookie domain settings.
Accounts needed: one dealer owner (new registration), a dealer manager and a sales member (invited), an admin with dealer decision authority, a private seller, a buyer.
Run in order: apply migrations to staging DB only after review; validate:live-runtime; validate:communications:providers; register dealer -> verify email -> onboarding -> admin approve/reject/suspend/reinstate -> listing create/photos/delete (draft, with bids, live auction, sold) -> team invite/accept/replay/remove -> check a removed member's next request; run the PROPOSED RLS migration on a disposable DB first.
