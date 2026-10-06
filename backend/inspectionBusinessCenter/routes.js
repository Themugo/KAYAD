// KAYAD Inspection Business Center API
import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import requireProviderOwnership from '../inspection/middleware/requireProviderOwnership.js';
import { providerService } from '../inspection/services/index.js';
import { bookingService } from '../inspection/services/bookingService.js';
import { settlementService } from '../inspection/services/settlementService.js';
import dashboardService from './services/dashboardService.js';
import engineerService from './services/engineerService.js';
import reportReviewService from './services/reportReviewService.js';
import businessAnalyticsService from './services/businessAnalyticsService.js';
import { customerService, financeService } from './services/customerService.js';
import db from '../inspection/services/dbAdapter.js';

const router = express.Router();
router.use(requireAuth);

const audit = async (providerId, req, actionType, entityType = null, entityId = null, details = {}) => {
  try {
    await db.create('business_audit_logs', {
      provider_id: providerId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      performed_by: req.user?.id || null,
      details,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || null,
      created_at: new Date(),
    });
  } catch (_) { /* audit must never break the business operation */ }
};

router.get('/inspector/me', asyncHandler(async (req, res) => {
  if (!['ghost_checker','admin','superadmin'].includes(req.user.role)) return res.status(403).json({ success:false, message:'Inspector access required' });
  const staff = await db.findOne('inspection_staff', { user_id: req.user.id, is_active: true });
  if (!staff && !['admin','superadmin'].includes(req.user.role)) return res.status(404).json({ success:false, message:'No active inspector profile found.' });
  const bookings = staff ? await db.find('inspection_bookings', { assigned_staff_id: staff.id, status: { $nin: ['cancelled'] } }, { sort: { scheduled_date: 1, scheduled_time: 1 }, limit: 100 }) : [];
  res.json({ success:true, data:{ staff: staff ? engineerService.formatEngineerBrief(staff) : null, bookings } });
}));

router.get('/me', asyncHandler(async (req, res) => {
  const provider = await providerService.getProviderByUserId(req.user.id);
  if (!provider) return res.status(404).json({ success: false, message: 'No inspection provider account found for this user.' });
  return res.json({ success: true, provider });
}));

router.get('/:providerId/dashboard', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getExecutiveDashboard(req.params.providerId) })));
router.get('/:providerId/attention', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getJobsNeedingAttention(req.params.providerId) })));
router.get('/:providerId/schedule/day', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getDailySchedule(req.params.providerId, req.query.date) })));
router.get('/:providerId/schedule/week', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getWeeklySchedule(req.params.providerId, req.query.startDate) })));
router.get('/:providerId/schedule/month', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getMonthlyOverview(req.params.providerId, Number(req.query.year), Number(req.query.month)) })));
router.get('/:providerId/bookings', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await bookingService.getProviderBookings(req.params.providerId, req.query) })));
router.get('/:providerId/bookings/status', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardService.getJobsByStatus(req.params.providerId) })));
router.post('/:providerId/bookings/:bookingId/status', requireProviderOwnership, asyncHandler(async (req, res) => {
  const result = await bookingService.updateBookingStatus(req.params.bookingId, req.body.status, req.user.id, req.body.staffId || null, req.body.notes || null, req.params.providerId);
  await audit(req.params.providerId, req, 'booking_status_updated', 'booking', req.params.bookingId, { status: req.body.status });
  res.json({ success: true, data: result });
}));

router.get('/:providerId/engineers', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.getEngineers(req.params.providerId, req.query) })));
router.post('/:providerId/engineers', requireProviderOwnership, asyncHandler(async (req, res) => {
  const result = await engineerService.createEngineer(req.params.providerId, req.body);
  await audit(req.params.providerId, req, 'engineer_created', 'engineer', result.id);
  res.status(201).json({ success: true, data: result });
}));
router.get('/:providerId/engineers/available', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.getAvailableEngineers(req.params.providerId, req.query.bookingId) })));
router.get('/:providerId/engineers/:engineerId/performance', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.getEngineerPerformance(req.params.engineerId, req.query.period || 'monthly') })));
router.patch('/:providerId/engineers/:engineerId', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.updateEngineer(req.params.engineerId, req.body) })));
router.post('/:providerId/engineers/:engineerId/availability', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.setAvailability(req.params.engineerId, Boolean(req.body.isAvailable)) })));
router.get('/:providerId/engineers/:engineerId/schedule', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.getEngineerSchedule(req.params.engineerId, req.query.startDate, req.query.endDate) })));
router.post('/:providerId/engineers/:engineerId/certifications', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await engineerService.addCertification(req.params.engineerId, req.body) })));

router.get('/:providerId/reports/queue', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await reportReviewService.getReviewQueue(req.params.providerId, req.query.status || null) })));
router.post('/:providerId/reports/:reportId/submit', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await reportReviewService.submitForReview(req.params.reportId, req.user.id) })));
router.post('/:providerId/reports/:reportId/approve', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await reportReviewService.approveReport(req.params.reportId, req.user.id, req.body.notes || null) })));
router.post('/:providerId/reports/:reportId/corrections', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await reportReviewService.requestCorrections(req.params.reportId, req.user.id, req.body.corrections || []) })));
router.get('/:providerId/reports/:reportId/corrections', requireProviderOwnership, asyncHandler(async (req, res) => {
  const version = await reportReviewService.getLatestVersion(req.params.reportId);
  res.json({ success: true, data: version ? await reportReviewService.getCorrections(version.id) : [] });
}));
router.post('/:providerId/reports/:reportId/send', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await reportReviewService.sendToCustomer(req.params.reportId, req.body.method || 'portal') })));

router.get('/:providerId/analytics', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await businessAnalyticsService.getBusinessAnalytics(req.params.providerId, req.query.period || 'monthly') })));
router.get('/:providerId/analytics/revenue', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await financeService.getFinancialOverview(req.params.providerId, req.query.period || 'monthly') })));
router.get('/:providerId/analytics/quality', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await businessAnalyticsService.getBusinessAnalytics(req.params.providerId, req.query.period || 'monthly').then(x => x.quality) })));

router.get('/:providerId/finance/overview', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await financeService.getFinancialOverview(req.params.providerId, req.query.period || 'monthly') })));
router.get('/:providerId/finance/transactions', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await financeService.getTransactions(req.params.providerId, req.query) })));
router.get('/:providerId/finance/settlements', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await financeService.getSettlements(req.params.providerId, req.query.status || null) })));
router.post('/:providerId/finance/settlements', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await settlementService.generateSettlement(req.params.providerId, req.body.periodStart, req.body.periodEnd, req.user.id) })));

router.get('/:providerId/customers', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await customerService.getCustomers(req.params.providerId, req.query) })));
router.get('/:providerId/customers/:customerId', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await customerService.getCustomerById(req.params.customerId) })));
router.get('/:providerId/customers/:customerId/history', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await customerService.getCustomerHistory(req.params.customerId) })));

router.get('/:providerId/profile', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.getProviderProfile(req.params.providerId) })));
router.patch('/:providerId/profile', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.updateProvider(req.params.providerId, req.body) })));
router.get('/:providerId/packages', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.getPackages(req.params.providerId, req.query.includeInactive === 'true') })));
router.post('/:providerId/packages', requireProviderOwnership, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await providerService.createPackage(req.params.providerId, req.body) })));
router.patch('/:providerId/packages/:packageId', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.updatePackage(req.params.providerId, req.params.packageId, req.body) })));
router.get('/:providerId/branches', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.getBranches(req.params.providerId) })));
router.post('/:providerId/branches', requireProviderOwnership, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await providerService.createBranch(req.params.providerId, req.body) })));
router.get('/:providerId/credentials', requireProviderOwnership, asyncHandler(async (req, res) => res.json({ success: true, data: await providerService.getCredentials(req.params.providerId) })));
router.post('/:providerId/credentials', requireProviderOwnership, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await providerService.addCredential(req.params.providerId, req.body) })));

router.get('/:providerId/promos', requireProviderOwnership, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await db.find('inspection_promos', { provider_id: req.params.providerId }, { sort: { starts_at: -1 } }) });
}));
router.post('/:providerId/promos', requireProviderOwnership, asyncHandler(async (req, res) => {
  const promo = await db.create('inspection_promos', { provider_id: req.params.providerId, ...req.body, created_at: new Date() });
  res.status(201).json({ success: true, data: promo });
}));
router.patch('/:providerId/promos/:promoId', requireProviderOwnership, asyncHandler(async (req, res) => {
  const promo = await db.findById('inspection_promos', req.params.promoId);
  if (!promo || String(promo.provider_id) !== String(req.params.providerId)) return res.status(404).json({ success: false, message: 'Promotion not found' });
  res.json({ success: true, data: await db.update('inspection_promos', req.params.promoId, { ...req.body, updated_at: new Date() }) });
}));

router.get('/:providerId/documents', requireProviderOwnership, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await db.find('business_documents', { provider_id: req.params.providerId }, { sort: { expiry_date: 1, created_at: -1 } }) });
}));
router.post('/:providerId/documents', requireProviderOwnership, asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await db.create('business_documents', { provider_id: req.params.providerId, ...req.body, created_at: new Date(), updated_at: new Date() }) })));
router.patch('/:providerId/documents/:documentId', requireProviderOwnership, asyncHandler(async (req, res) => {
  const doc = await db.findById('business_documents', req.params.documentId);
  if (!doc || String(doc.provider_id) !== String(req.params.providerId)) return res.status(404).json({ success: false, message: 'Document not found' });
  res.json({ success: true, data: await db.update('business_documents', req.params.documentId, { ...req.body, updated_at: new Date() }) });
}));

export default router;
