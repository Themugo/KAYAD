// ============================================================
// KAYAD INSPECTION MARKETPLACE - ROUTES
// ============================================================

import express from 'express';
import * as controller from '../controllers/providerController.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/auth.js';

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

/**
 * ============================================================
 * PROVIDER ROUTES (Provider/Admin only)
 * ============================================================
 */

// Provider dashboard
router.get('/provider/:providerId/dashboard', requireAuth, controller.getProviderDashboard);

// Update provider
router.put('/provider/:providerId', requireAuth, controller.updateProvider);

// Add credential
router.post('/provider/:providerId/credentials', requireAuth, controller.addCredential);

// Get provider bookings
router.get('/provider/:providerId/bookings', requireAuth, controller.getProviderBookings);

// Update booking status
router.post('/provider/:providerId/bookings/:bookingId/status', requireAuth, controller.updateBookingStatus);

// Assign inspector
router.post('/provider/:providerId/bookings/:bookingId/assign', requireAuth, controller.assignInspector);

// Create report
router.post('/provider/:providerId/bookings/:bookingId/report', requireAuth, controller.createReport);

// Generate PDF
router.post('/provider/:providerId/reports/:reportId/pdf', requireAuth, controller.generatePDF);

// Share report
router.post('/provider/:providerId/reports/:reportId/share', requireAuth, controller.shareReport);

// Revoke share
router.delete('/provider/:providerId/reports/:reportId/share', requireAuth, controller.revokeReportShare);

// Get transactions
router.get('/provider/:providerId/transactions', requireAuth, controller.getTransactions);

// Get settlements
router.get('/provider/:providerId/settlements', requireAuth, controller.getSettlements);

// Generate settlement
router.post('/provider/:providerId/settlements', requireAuth, controller.generateSettlement);

// Get earnings summary
router.get('/provider/:providerId/earnings', requireAuth, controller.getEarningsSummary);

// Get earnings summary (alternative endpoint)
router.get('/provider/:providerId/earnings-summary', requireAuth, controller.getProviderEarnings);

/**
 * ============================================================
 * ADMIN ROUTES
 * ============================================================
 */

// Process payment (admin)
router.post('/bookings/:bookingId/payment', requireRole(['admin']), controller.processPayment);

// Process refund (admin)
router.post('/bookings/:bookingId/refund', requireRole(['admin']), controller.processRefund);

/**
 * ============================================================
 * LEGACY/REPORT ROUTES (for backward compatibility)
 * ============================================================
 */

// Get report
router.get('/reports/:reportId', optionalAuth, controller.getReport);

export default router;
