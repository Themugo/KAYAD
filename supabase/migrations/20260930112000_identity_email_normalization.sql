-- Deterministic application-level email normalization is reinforced at the database boundary.
-- Existing duplicate normalized emails must be reconciled before this index can be applied.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_normalized
  ON public.users (lower(btrim(email)));
