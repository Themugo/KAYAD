// Admin governance of the single provider network. Mounted under the existing
// admin router (global protect + adminOnly + MANAGE_INSPECTIONS permission by path
// + automatic audit log). Every decision is also written to inspection_status_history.
import express from 'express';
import { validate } from '../middleware/validate.js';
import * as c from '../inspection/controllers/governanceController.js';
import {
  adminProviderDecisionSchema, adminCredentialDecisionSchema, adminCapabilityDecisionSchema,
} from '../validation/automotiveServices.schema.js';

const router = express.Router();
router.get('/providers', c.adminList);
router.get('/providers/:id', c.adminGet);
router.post('/providers/:id/decision', validate(adminProviderDecisionSchema), c.adminProviderDecision);
router.post('/credentials/:id/decision', validate(adminCredentialDecisionSchema), c.adminCredentialDecision);
router.post('/capabilities/:id/decision', validate(adminCapabilityDecisionSchema), c.adminCapabilityDecision);
router.post('/staff/:id/end', c.adminEndStaff);
export default router;
