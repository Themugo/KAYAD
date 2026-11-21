/*
# idempotency_keys — critical, previously-missing payment infrastructure

middleware/idempotency.js guards every payment, escrow-release,
escrow-refund, escrow-confirm-delivery, and escrow-dispute request in
the app. Its core check (IdempotencyKey.getCachedResponse, called
directly, not wrapped in a try/catch the way most of the rest of that
file's DB calls are) had no method and no table behind it at all -
every single request through this middleware would have thrown
uncaught before reaching real payment logic. Very likely the deeper
root cause behind several of the payment/escrow-flow issues already
found and fixed this session.

Column list is the complete set middleware/idempotency.js writes via
IdempotencyKey.record(): key, operationType, user, requestParams,
responseData, responseStatus, success, errorMessage, resourceIds.
key is UNIQUE - not strictly required for correctness (the middleware
already acquires a distributed lock via withLock before checking/
writing this), but a real backstop is cheap insurance if that lock
layer is ever bypassed or fails.

## deleted_by (cars, users)
Also added alongside this: Car.softDelete(id, actorId) and
User.softDelete(id, actorId) were added to models/Car.js and
models/User.js this session (another missing-method gap, same class as
IdempotencyKey), and confirmed both tables need a deleted_by column to
match - cars already had deleted_at, and deletedBy is independently
confirmed real via controllers/duplicateController.js's direct
`car.deletedBy = req.user.id`. users had deleted_at too but no
deletedBy; added for symmetry with cars and because
routes/adminRoutes.js's User.softDelete call site needs it for the
same audit purpose.
*/

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  operation_type TEXT,
  "user" UUID REFERENCES users(id),
  request_params JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  response_status INTEGER,
  success BOOLEAN,
  error_message TEXT,
  resource_ids JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON idempotency_keys("user");

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cars_deleted_by ON cars(deleted_by);
