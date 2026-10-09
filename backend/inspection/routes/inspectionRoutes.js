// ============================================================
// KAYAD INSPECTION MARKETPLACE - ROUTES
// ============================================================

import express from 'express';
import * as controller from '../controllers/providerController.js';
import * as legacy from '../controllers/legacyCompatibilityController.js';
import * as gov from '../controllers/governanceController.js';
import { declareCapabilitySchema, inviteStaffSchema, requestAffiliationSchema, addCredentialSchema } from '../../validation/automotiveServices.schema.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/auth.js';
import requireProviderOwnership from '../middleware/requireProviderOwnership.js';
import { validate } from '../../middleware/validate.js';
import { inspectionPaymentSchema, inspectionPaymentInitiateSchema, inspectionBookingSchema } from '../../validation/phase22.schema.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { idempotencyCheck } from '../../middleware/idempotency.js';
import { paymentLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

/**
 * ============================================================
 * PUBLIC ROUTES
 * ============================================================
 */

// Search providers (public marketplace)
router.get('/providers', controller.searchProviders);

// Get provider profile (public)
router.get('/providers/:providerId', controller.getProviderProfile);

// Get provider reviews (public)
router.get('/providers/:providerId/reviews', controller.getProviderReviews);

// Get available time slots (public)
router.get('/providers/:providerId/slots', controller.getAvailableSlots);

// Get report by share token (public - no auth required)
router.get('/reports/share/:token', controller.getReportByShareToken);

// Get inspection categories (public)
router.get('/categories', controller.getInspectionCategories);

// Canonical expertise taxonomy + symptom hints (public, read-only)
router.get('/service-taxonomy', gov.getServiceTaxonomy);

/**
 * ============================================================
 * CUSTOMER ROUTES (Authenticated)
 * ============================================================
 */

// Create booking
router.post('/bookings', requireAuth, validate(inspectionBookingSchema), controller.createBooking);

// Get customer bookings
router.get('/bookings', requireAuth, controller.getCustomerBookings);

// Get booking by reference
router.get('/bookings/:reference', requireAuth, controller.getBooking);

// Cancel booking
router.post('/bookings/:bookingId/cancel', requireAuth, controller.cancelBooking);

// Submit review
router.post('/reviews', requireAuth, controller.submitReview);


/**
 * ============================================================
 * PROVIDER ROUTES (Provider/Admin only)
 * ============================================================
 */

// The signed-in user's own business application (owner-scoped by user id)
router.get('/provider-me', requireAuth, gov.myProvider);

// Capabilities (declared by the business; verified only by an administrator)
router.get('/provider/:providerId/capabilities', requireAuth, requireProviderOwnership, gov.listCapabilities);
router.post('/provider/:providerId/capabilities', requireAuth, requireProviderOwnership, validate(declareCapabilitySchema), gov.declareCapability);

// Team affiliations (two-sided: business and individual must both confirm)
router.get('/provider/:providerId/staff', requireAuth, requireProviderOwnership, gov.listStaff);
router.post('/provider/:providerId/staff', requireAuth, requireProviderOwnership, validate(inviteStaffSchema), gov.inviteStaff);
router.post('/provider/:providerId/staff/:staffId/confirm', requireAuth, requireProviderOwnership, gov.confirmStaff);
router.post('/provider/:providerId/staff/:staffId/end', requireAuth, requireProviderOwnership, gov.endStaff);

// The individual's own side of an affiliation
router.get('/affiliations/my', requireAuth, gov.myAffiliations);
router.post('/affiliations', requireAuth, validate(requestAffiliationSchema), gov.requestAffiliation);
router.post('/affiliations/:staffId/accept', requireAuth, gov.acceptAffiliation);
router.post('/affiliations/:staffId/leave', requireAuth, gov.leaveAffiliation);

// Provider dashboard
router.get('/provider/:providerId/dashboard', requireAuth, requireProviderOwnership, controller.getProviderDashboard);

// Update provider
router.put('/provider/:providerId', requireAuth, requireProviderOwnership, controller.updateProvider);

// Add credential
router.post('/provider/:providerId/credentials', requireAuth, requireProviderOwnership, validate(addCredentialSchema), controller.addCredential);

// Get provider bookings
router.get('/provider/:providerId/bookings', requireAuth, requireProviderOwnership, controller.getProviderBookings);

// Update booking status
router.post('/provider/:providerId/bookings/:bookingId/status', requireAuth, requireProviderOwnership, controller.updateBookingStatus);

// Assign inspector
router.post('/provider/:providerId/bookings/:bookingId/assign', requireAuth, requireProviderOwnership, controller.assignInspector);

// Create report
router.post('/provider/:providerId/bookings/:bookingId/report', requireAuth, requireProviderOwnership, controller.createReport);

// Generate PDF
router.post('/provider/:providerId/reports/:reportId/pdf', requireAuth, requireProviderOwnership, controller.generatePDF);
router.get('/reports/:reportId/pdf', requireAuth, controller.downloadPDF);

// Share report
router.post('/provider/:providerId/reports/:reportId/share', requireAuth, requireProviderOwnership, controller.shareReport);

// Revoke share
router.delete('/provider/:providerId/reports/:reportId/share', requireAuth, requireProviderOwnership, controller.revokeReportShare);

// Get transactions
router.get('/provider/:providerId/transactions', requireAuth, requireProviderOwnership, controller.getTransactions);

// Get settlements
router.get('/provider/:providerId/settlements', requireAuth, requireProviderOwnership, controller.getSettlements);

// Generate settlement
router.post('/provider/:providerId/settlements', requireAuth, requireProviderOwnership, controller.generateSettlement);

// Mark settlement paid (admin/service-controlled financial operation)
router.post('/provider/:providerId/settlements/:settlementId/pay', requireAuth, requireRole(['admin']), controller.markSettlementPaid);

// Get earnings summary
router.get('/provider/:providerId/earnings', requireAuth, requireProviderOwnership, controller.getEarningsSummary);

// Get earnings summary (alternative endpoint)
router.get('/provider/:providerId/earnings-summary', requireAuth, requireProviderOwnership, controller.getProviderEarnings);

/**
 * ============================================================
 * ADMIN ROUTES
 * ============================================================
 */

// Process payment (admin)
router.post('/bookings/:bookingId/payment/initiate', requireAuth, paymentLimiter, csrfProtection, idempotencyCheck, validate(inspectionPaymentInitiateSchema), controller.initiateInspectionPayment);
router.post('/bookings/:bookingId/payment', requireRole(['admin']), validate(inspectionPaymentSchema), controller.processPayment);

// Process refund (admin)
router.post('/bookings/:bookingId/refund', requireRole(['admin']), controller.processRefund);

/**
 * ============================================================
 * LEGACY/REPORT ROUTES (for backward compatibility)
 * ============================================================
 */

// Get report
router.get('/reports/:reportId', requireAuth, controller.getReport);

/**
 * ============================================================
 * LEGACY API COMPATIBILITY
 * ============================================================
 * These aliases preserve existing client contracts while delegating to the
 * canonical vehicle_inspections execution record. No legacy model or
 * digital-inspection storage is used.
 */
router.get('/my', requireAuth, legacy.listMine);
router.post('/order', requireAuth, legacy.createOrder);
router.post('/confirm-payment', requireAuth, legacy.confirmPayment);
router.get('/available-inspectors', requireAuth, requireRole(['admin', 'superadmin']), legacy.availableInspectors);
router.get('/car/:carId', requireAuth, legacy.getByCar);
router.get('/:id', requireAuth, legacy.getById);
router.post('/:id/assign', requireAuth, requireRole(['admin', 'superadmin']), legacy.assign);
router.post('/:id/start', requireAuth, legacy.start);
router.post('/:id/submit', requireAuth, legacy.submit);

export default router;
