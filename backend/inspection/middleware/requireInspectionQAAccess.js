import { AppError } from '../../utils/AppError.js';
import { providerService } from '../services/index.js';
import db from '../../db/index.js';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);
const QA_ROLES = new Set(['qa', 'quality_assurance', 'quality-assurance', 'auditor', 'quality_auditor']);

/**
 * QA routes must permit independent KAYAD QA staff as well as administrators.
 * Provider ownership alone is intentionally insufficient because the whole
 * point of this boundary is segregation of duties from the executing provider.
 */
export const requireInspectionQAAccess = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (ADMIN_ROLES.has(req.user.role)) return next();

    const providerId = req.params.providerId;
    const provider = await providerService.getProviderById(providerId);
    if (!provider) return next(new AppError('Provider not found', 404));

    const staff = await db.findOne('inspection_staff', {
      provider_id: providerId,
      user_id: req.user.id,
      is_active: true,
    });

    const role = String(staff?.role || '').toLowerCase();
    if (!QA_ROLES.has(role)) {
      return next(new AppError('Only designated independent QA/auditor staff or administrators may review inspection reports', 403));
    }

    req.provider = provider;
    req.inspectionQAStaff = staff;
    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireInspectionQAAccess;
