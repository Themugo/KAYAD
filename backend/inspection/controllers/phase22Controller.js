import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import phase22Service from '../services/phase22Service.js';

export const registerProvider = asyncHandler(async (req, res) => response.created(res, await phase22Service.registerProvider(req.user.id, req.body)));
export const nearbyProviders = asyncHandler(async (req, res) => response.success(res, await phase22Service.nearbyProviders({
  latitude: Number(req.query.lat), longitude: Number(req.query.lon), serviceType: req.query.serviceType, radiusKm: Number(req.query.radiusKm || 50),
})));
export const reportAccess = asyncHandler(async (req, res) => response.success(res, await phase22Service.getReportAccess(req.params.reportId, req.user.id)));
export const purchaseReport = asyncHandler(async (req, res) => response.success(res, await phase22Service.purchaseReport(req.params.reportId, req.user.id, req.body.paymentReference)));
export const openInspectionDispute = asyncHandler(async (req, res) => response.created(res, await phase22Service.openInspectionDispute(req.params.bookingId, req.user.id, req.body.type, req.body.description)));
export const addInspectionEvidence = asyncHandler(async (req, res) => response.created(res, await phase22Service.addInspectionDisputeEvidence(req.params.disputeId, req.user.id, req.body.type, req.body.evidence)));
export const transitionServiceJob = asyncHandler(async (req, res) => response.success(res, await phase22Service.transitionServiceJob(req.params.jobId, req.user.id, req.body.status, req.body.reason)));
export const openServiceJobDispute = asyncHandler(async (req, res) => response.created(res, await phase22Service.openServiceJobDispute(req.params.jobId, req.user.id, req.body.type, req.body.description)));
export const addServiceJobEvidence = asyncHandler(async (req, res) => response.created(res, await phase22Service.addServiceJobDisputeEvidence(req.params.disputeId, req.user.id, req.body.type, req.body.evidence)));
export const resolveServiceJobDispute = asyncHandler(async (req, res) => response.success(res, await phase22Service.adminResolveServiceJobDispute(req.user.id, req.params.requestId, req.body.decision, req.body.reason)));
export const resolveInspectionDispute = asyncHandler(async (req, res) => response.success(res, await phase22Service.adminResolveInspectionDispute(req.user.id, req.params.requestId, req.body.decision, req.body.refundAmount, req.body.reason)));
