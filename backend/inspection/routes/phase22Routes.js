import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as c from '../controllers/phase22Controller.js';

const router = express.Router();
router.post('/providers/register', requireAuth, c.registerProvider);
router.get('/providers/nearby', c.nearbyProviders);
router.get('/reports/:reportId/access', requireAuth, c.reportAccess);
router.post('/reports/:reportId/purchase', requireAuth, c.purchaseReport);
router.post('/bookings/:bookingId/disputes', requireAuth, c.openInspectionDispute);
router.post('/disputes/:disputeId/evidence', requireAuth, c.addInspectionEvidence);
router.post('/service-jobs/:jobId/transition', requireAuth, c.transitionServiceJob);
router.post('/service-jobs/:jobId/disputes', requireAuth, c.openServiceJobDispute);
router.post('/service-job-disputes/:disputeId/evidence', requireAuth, c.addServiceJobEvidence);
router.post('/admin/service-job-disputes/:requestId/resolve', requireAuth, requirePermission('manage_inspections'), c.resolveServiceJobDispute);
router.post('/admin/inspection-disputes/:requestId/resolve', requireAuth, requirePermission('manage_inspections'), c.resolveInspectionDispute);
export default router;
