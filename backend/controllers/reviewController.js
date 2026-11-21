import { logError } from '../infrastructure/logging/index.js';
import { createDealerReview, deleteReview, listDealerReviews, listMyReviews } from '../services/review.service.js';
import { isRoleAllowed } from '../config/roles.js';

const handleError = (res, err, fallback) => {
  const status = Number(err?.statusCode) || 500;
  return res.status(status).json({ success: false, message: status === 500 ? fallback : err.message });
};

export const createReview = async (req, res) => {
  try {
    const review = await createDealerReview({
      reviewerId: req.user.id,
      dealerId: req.body.dealer,
      carId: req.body.carId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({ success: true, message: 'Review submitted for moderation', review });
  } catch (err) {
    logError('createReview error:', err.message);
    return handleError(res, err, 'Failed to create review');
  }
};

export const getDealerReviews = async (req, res) => {
  try {
    const result = await listDealerReviews(req.params.dealerId, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    logError('getDealerReviews error:', err.message);
    return handleError(res, err, 'Failed to fetch reviews');
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const result = await listMyReviews(req.user.id, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    logError('getMyReviews error:', err.message);
    return handleError(res, err, 'Failed to fetch reviews');
  }
};

export const deleteOwnReview = async (req, res) => {
  try {
    // STAGE 4 (S4-F-01): the admin override tested for the literal 'super_admin', a role that
    // cannot be stored (profiles_role_check) - so the real 'superadmin' and the platform owner
    // were refused while plain 'admin' was allowed. Use the canonical role helper.
    await deleteReview(req.params.id, req.user.id, isRoleAllowed(req.user, ['admin', 'superadmin']));
    return res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    logError('deleteReview error:', err.message);
    return handleError(res, err, 'Failed to delete review');
  }
};
