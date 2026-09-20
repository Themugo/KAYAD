import { getSupabase } from '../../utils/supabase.js';
import { AppError } from '../../utils/AppError.js';

const rpc = async (name, args, message) => {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw new AppError(error.message || message, 409);
  return data;
};

export class Phase22Service {
  async registerProvider(userId, profile) {
    return rpc('kayad_create_inspection_provider_application', { p_user_id: userId, p_profile: profile }, 'Provider registration failed');
  }

  async nearbyProviders({ latitude, longitude, serviceType, radiusKm = 50 }) {
    return rpc('kayad_find_nearby_inspection_providers', {
      p_lat: latitude, p_lon: longitude, p_service_type: serviceType || null, p_radius_km: radiusKm,
    }, 'Nearby provider search failed');
  }

  async getReportAccess(reportId, buyerId) {
    return rpc('kayad_get_inspection_report_access', { p_report_id: reportId, p_buyer_id: buyerId }, 'Report access check failed');
  }

  async purchaseReport(reportId, buyerId, paymentReference) {
    return rpc('kayad_purchase_inspection_report_download', {
      p_report_id: reportId, p_buyer_id: buyerId, p_payment_reference: paymentReference,
    }, 'Report purchase failed');
  }

  async submitReview(bookingId, reviewerId, rating, comment) {
    return rpc('kayad_submit_inspection_review_atomic', {
      p_booking_id: bookingId, p_reviewer_id: reviewerId, p_rating: rating, p_comment: comment || null,
    }, 'Review submission failed');
  }

  async openInspectionDispute(bookingId, actorId, type, description) {
    return rpc('kayad_open_inspection_dispute_atomic', {
      p_booking_id: bookingId, p_actor_id: actorId, p_type: type, p_description: description,
    }, 'Inspection dispute creation failed');
  }

  async addInspectionDisputeEvidence(disputeId, actorId, type, evidence) {
    return rpc('kayad_add_inspection_dispute_evidence_atomic', {
      p_dispute_id: disputeId, p_actor_id: actorId, p_type: type, p_evidence: evidence || {},
    }, 'Dispute evidence submission failed');
  }

  async openServiceJobDispute(jobId, actorId, type, description) {
    return rpc('kayad_open_service_job_dispute_atomic', {
      p_job_id: jobId, p_actor_id: actorId, p_type: type, p_description: description,
    }, 'Service-job dispute creation failed');
  }

  async addServiceJobDisputeEvidence(disputeId, actorId, type, evidence) {
    return rpc('kayad_add_service_job_dispute_evidence_atomic', {
      p_dispute_id: disputeId, p_actor_id: actorId, p_type: type, p_evidence: evidence || {},
    }, 'Service-job dispute evidence submission failed');
  }

  async transitionServiceJob(jobId, actorId, nextStatus, reason) {
    return rpc('kayad_transition_service_job_atomic', {
      p_job_id: jobId, p_actor_id: actorId, p_next_status: nextStatus, p_reason: reason || null,
    }, 'Service-job transition failed');
  }

  async adminResolveServiceJobDispute(actorId, requestId, decision, reason) {
    return rpc('kayad_admin_resolve_service_job_dispute_atomic', {
      p_actor_id: actorId, p_request_id: requestId, p_decision: decision, p_reason: reason || null,
    }, 'Service-job dispute resolution failed');
  }

  async adminResolveInspectionDispute(actorId, requestId, decision, refundAmount, reason) {
    return rpc('kayad_admin_resolve_inspection_dispute_atomic', {
      p_actor_id: actorId, p_request_id: requestId, p_decision: decision,
      p_refund_amount: refundAmount ?? null, p_reason: reason || null,
    }, 'Inspection dispute resolution failed');
  }
}

export default new Phase22Service();
