import { z } from 'zod';

const uuid = z.string().uuid();
const text = (max) => z.string().trim().min(1).max(max);
const nullableText = (max) => z.string().trim().min(1).max(max).nullable().optional();
const jsonObject = z.record(z.string(), z.unknown());

export const phase22ProviderProfileSchema = z.object({
  companyName: text(160).optional(),
  phone: text(40).optional(),
  country: text(80).optional(),
  county: text(120).optional(),
  town: text(120).optional(),
  address: text(240).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  serviceTypes: z.array(text(80)).max(20).optional(),
}).passthrough();

export const nearbyProviderQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  serviceType: nullableText(80),
  radiusKm: z.coerce.number().finite().gt(0).max(500).default(50),
});

export const reportIdParamsSchema = z.object({ reportId: uuid });
export const bookingIdParamsSchema = z.object({ bookingId: uuid });
export const disputeIdParamsSchema = z.object({ disputeId: uuid });
export const jobIdParamsSchema = z.object({ jobId: uuid });
export const requestIdParamsSchema = z.object({ requestId: uuid });

export const purchaseReportSchema = z.object({
  paymentReference: text(160),
});

export const disputeBodySchema = z.object({
  type: text(80),
  description: text(4000),
});

export const disputeEvidenceSchema = z.object({
  type: text(80),
  evidence: jsonObject.default({}),
});

export const serviceJobTransitionSchema = z.object({
  status: z.enum(['requested', 'quoted', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'disputed', 'refunded']),
  reason: nullableText(2000),
});

export const adminInspectionDisputeResolutionSchema = z.object({
  decision: text(80),
  refundAmount: z.coerce.number().finite().nonnegative().nullable().optional(),
  reason: nullableText(4000),
});

export const adminServiceJobDisputeResolutionSchema = z.object({
  decision: text(80),
  reason: nullableText(4000),
});

export const inspectionPaymentSchema = z.object({
  method: z.enum(['mpesa', 'card', 'bank_transfer', 'cash']),
  reference: text(160),
});

export const inspectionPaymentInitiateSchema = z.object({
  phone: text(30),
});
