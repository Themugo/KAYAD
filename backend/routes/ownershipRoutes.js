import express from 'express';
import { z } from 'zod';
import { protect, allowRoles } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import {
  ownershipVehicleSchema, ownershipServiceRecordSchema, ownershipExpenseSchema,
  ownershipDocumentSchema, ownershipTripSchema, completeOwnershipReminderSchema,
  ownershipSaleSchema, vehiclePassportSchema,
} from '../validation/ownership.schema.js';
import {
  getDashboard, addVehicle, getVehicle, addService, addExpense, addDocument, addTrip,
  completeReminder, markSold, createPassport, getPassport, getPublicPassport, findPassportByVin,
} from '../controllers/ownershipController.js';

const router = express.Router();

const vehicleIdParamsSchema = z.object({ vehicleId: z.string().uuid() });
const reminderIdParamsSchema = z.object({ reminderId: z.string().uuid() });
const passportIdParamsSchema = z.object({ passportId: z.string().uuid() });
const vinParamsSchema = z.object({ vin: z.string().trim().min(5).max(32) });


router.get('/dashboard', protect, getDashboard);
router.post('/vehicles', protect, validate(ownershipVehicleSchema), addVehicle);
router.get('/vehicles/:vehicleId', protect, validateParams(vehicleIdParamsSchema), getVehicle);
router.post('/vehicles/:vehicleId/services', protect, validateParams(vehicleIdParamsSchema), validate(ownershipServiceRecordSchema), addService);
router.post('/vehicles/:vehicleId/expenses', protect, validateParams(vehicleIdParamsSchema), validate(ownershipExpenseSchema), addExpense);
router.post('/vehicles/:vehicleId/documents', protect, validateParams(vehicleIdParamsSchema), validate(ownershipDocumentSchema), addDocument);
router.post('/vehicles/:vehicleId/trips', protect, validateParams(vehicleIdParamsSchema), validate(ownershipTripSchema), addTrip);
router.patch('/reminders/:reminderId/complete', protect, validateParams(reminderIdParamsSchema), validate(completeOwnershipReminderSchema), completeReminder);
router.patch('/vehicles/:vehicleId/sold', protect, validateParams(vehicleIdParamsSchema), validate(ownershipSaleSchema), markSold);

router.post('/passports', protect, allowRoles('admin', 'superadmin', 'dealer', 'individual_seller'), validate(vehiclePassportSchema), createPassport);
// Full passport is owner/staff-only; the service enforces ownership and returns 404 for unrelated callers.
router.get('/passports/:passportId', protect, validateParams(passportIdParamsSchema), getPassport);
router.get('/passports/:passportId/public', validateParams(passportIdParamsSchema), getPublicPassport);
router.get('/passports/vin/:vin', validateParams(vinParamsSchema), findPassportByVin);

export default router;
