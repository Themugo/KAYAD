// ============================================================
// KAYAD INSPECTION MARKETPLACE - ROUTES
// ============================================================

import express from 'express';
import * as controller from '../controllers/providerController.js';
import * as legacy from '../controllers/legacyCompatibilityController.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/auth.js';
import requireProviderOwnership from '../middleware/requireProviderOwnership.js';
import requireInspectionQAAccess from '../middleware/requireInspectionQAAccess.js';
import { validate } from '../../middleware/validate.js';
import { inspectionPaymentSchema, inspectionPaymentInitiateSchema } from '../../validation/phase22.schema.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { idempotencyCheck } from '../../middleware/idempotency.js';
import { paymentLimiter } from '../../middleware/rateLimiter.js';
import { response } from '../../utils/response.js';
import { uploadEvidenceSingle, handleEvidenceUploadError, validateEvidenceUploadContent } from '../../middleware/evidenceUpload.js';
import * as executionController from '../controllers/executionController.js';
import { reportReviewService } from '../../inspectionBusinessCenter/services/reportReviewService.js';

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

/**
 * ============================================================
 * CUSTOMER ROUTES (Authenticated)
 * ============================================================
 */

// Create booking
router.post('/bookings', requireAuth, controller.createBooking);

// Get customer bookings
router.get('/bookings', requireAuth, controller.getCustomerBookings);

// Get booking by reference
router.get('/bookings/:reference', requireAuth, controller.getBooking);

// Cancel booking
router.post('/bookings/:bookingId/cancel', requireAuth, controller.cancelBooking);

// Submit review
router.post('/reviews', requireAuth, controller.submitReview);

// Canonical inspector execution: booking -> vehicle_inspections -> evidence/checklist -> report.
router.get('/execution/:bookingId', requireAuth, executionController.getExecutionDetails);
router.post('/execution/:bookingId/start', requireAuth, executionController.startInspection);
router.put('/execution/:bookingId/checklist', requireAuth, executionController.saveChecklist);
router.post('/execution/:bookingId/evidence', requireAuth, uploadEvidenceSingle, handleEvidenceUploadError, validateEvidenceUploadContent, executionController.uploadEvidence);
router.delete('/execution/:bookingId/evidence/:evidenceId', requireAuth, executionController.deleteEvidence);
router.post('/execution/:bookingId/complete', requireAuth, idempotencyCheck, executionController.completeInspection);

// Canonical report QA and customer delivery lifecycle.
router.get('/provider/:providerId/qa/queue', requireAuth, requireProviderOwnership, async (req, res, next) => {
  try { response.success(res, await reportReviewService.getReviewQueue(req.params.providerId, req.query.status || null)); } catch (e) { next(e); }
});
router.post('/provider/:providerId/reports/:reportId/qa/submit', requireAuth, requireProviderOwnership, async (req, res, next) => {
  try { response.success(res, await reportReviewService.submitForReview(req.params.reportId, req.user.id)); } catch (e) { next(e); }
});
router.post('/provider/:providerId/reports/:reportId/qa/approve', requireAuth, requireInspectionQAAccess, async (req, res, next) => {
  try { response.success(res, await reportReviewService.approveReport(req.params.reportId, req.user.id, req.body?.notes || null)); } catch (e) { next(e); }
});
router.post('/provider/:providerId/reports/:reportId/qa/corrections', requireAuth, requireInspectionQAAccess, async (req, res, next) => {
  try { response.success(res, await reportReviewService.requestCorrections(req.params.reportId, req.user.id, req.body?.corrections || [])); } catch (e) { next(e); }
});
router.post('/provider/:providerId/reports/:reportId/send', requireAuth, requireProviderOwnership, async (req, res, next) => {
  try { response.success(res, await reportReviewService.sendToCustomer(req.params.reportId, req.body?.method || 'email')); } catch (e) { next(e); }
});


/**
 * ============================================================
 * PROVIDER ROUTES (Provider/Admin only)
 * ============================================================
 */

// Provider dashboard
router.get('/provider/:providerId/dashboard', requireAuth, requireProviderOwnership, controller.getProviderDashboard);

// Update provider
router.put('/provider/:providerId', requireAuth, requireProviderOwnership, controller.updateProvider);

// Add credential
router.post('/provider/:providerId/credentials', requireAuth, requireProviderOwnership, controller.addCredential);

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
router.post('/provider/:providerId/settlements/:settlementId/pay', requireAuth, requireRole(['admin']), controller.initiateSettlementPayout);
router.post('/provider/:providerId/settlements/:settlementId/reconcile', requireAuth, requireRole(['admin']), controller.markSettlementPaid);

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
router.post('/bookings/:bookingId/payment', requireAuth, requireRole(['admin']), validate(inspectionPaymentSchema), controller.processPayment);

// Process refund (admin)
router.post('/bookings/:bookingId/refund', requireAuth, requireRole(['admin']), controller.processRefund);

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
