// backend/inspection/middleware/requireProviderOwnership.js
//
// Found while implementing/hardening the provider lifecycle (per this
// task's own security requirements: "Provider can only modify their
// own profile" / "Provider cannot access another provider's private
// data"): every :providerId-parameterized route in
// inspection/routes/inspectionRoutes.js had requireAuth (confirms the
// requester is logged in) but no ownership check at all - any
// authenticated user could read or write ANY provider's profile,
// earnings, transactions, settlements, bookings, and reports simply
// by putting a different provider's ID in the URL. Confirmed directly
// by reading every affected route before writing this fix, not
// assumed from the task's own wording alone.
//
// This middleware closes that gap consistently across every affected
// route, rather than patching each controller function individually -
// one real check, applied the same way everywhere, is safer than
// remembering to add the same ownership logic to 13 different
// handlers. Admins (role admin/superadmin - the real values confirmed
// against the users table's own CHECK constraint) are allowed through
// regardless of ownership, since this task also requires admin
// review/verify/suspend/reactivate capability over any provider.

import { AppError } from '../../utils/AppError.js';
import { providerService } from '../services/index.js';

const ADMIN_ROLES = ['admin', 'superadmin'];

export const requireProviderOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (ADMIN_ROLES.includes(req.user.role)) {
      return next();
    }

    const provider = await providerService.getProviderById(req.params.providerId);
    if (!provider) {
      return next(new AppError('Provider not found', 404));
    }

    if (String(provider.user_id) !== String(req.user.id)) {
      return next(new AppError('You do not have access to this provider account', 403));
    }

    // Attach the already-fetched provider to the request so downstream
    // handlers that also need it (several already call
    // providerService.getProviderById again) can reuse it instead of
    // querying twice - optional for callers, not required, so this
    // change alone cannot break any handler that doesn't use it.
    req.provider = provider;
    next();
  } catch (err) {
    next(err);
  }
};

export default requireProviderOwnership;
