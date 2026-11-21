import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  phase22ProviderProfileSchema, nearbyProviderQuerySchema, reportIdParamsSchema, bookingIdParamsSchema,
  disputeIdParamsSchema, jobIdParamsSchema, requestIdParamsSchema, purchaseReportSchema, disputeBodySchema,
  disputeEvidenceSchema, serviceJobTransitionSchema, adminInspectionDisputeResolutionSchema,
  adminServiceJobDisputeResolutionSchema,
} from '../../validation/phase22.schema.js';
import * as c from '../controllers/phase22Controller.js';

const router = express.Router();
router.post('/providers/register', requireAuth, validate(phase22ProviderProfileSchema), c.registerProvider);
router.get('/providers/nearby', validateQuery(nearbyProviderQuerySchema), c.nearbyProviders);
router.get('/reports/:reportId/access', requireAuth, validateParams(reportIdParamsSchema), c.reportAccess);
router.post('/reports/:reportId/purchase', requireAuth, validateParams(reportIdParamsSchema), validate(purchaseReportSchema), c.purchaseReport);
router.post('/bookings/:bookingId/disputes', requireAuth, validateParams(bookingIdParamsSchema), validate(disputeBodySchema), c.openInspectionDispute);
router.post('/disputes/:disputeId/evidence', requireAuth, validateParams(disputeIdParamsSchema), validate(disputeEvidenceSchema), c.addInspectionEvidence);
router.post('/service-jobs/:jobId/transition', requireAuth, validateParams(jobIdParamsSchema), validate(serviceJobTransitionSchema), c.transitionServiceJob);
router.post('/service-jobs/:jobId/disputes', requireAuth, validateParams(jobIdParamsSchema), validate(disputeBodySchema), c.openServiceJobDispute);
router.post('/service-job-disputes/:disputeId/evidence', requireAuth, validateParams(disputeIdParamsSchema), validate(disputeEvidenceSchema), c.addServiceJobEvidence);
router.post('/admin/service-job-disputes/:requestId/resolve', requireAuth, requirePermission('manage_inspections'), validateParams(requestIdParamsSchema), validate(adminServiceJobDisputeResolutionSchema), c.resolveServiceJobDispute);
router.post('/admin/inspection-disputes/:requestId/resolve', requireAuth, requirePermission('manage_inspections'), validateParams(requestIdParamsSchema), validate(adminInspectionDisputeResolutionSchema), c.resolveInspectionDispute);
export default router;
