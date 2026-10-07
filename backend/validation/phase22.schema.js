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

// Customer booking input is deliberately limited to scheduling, customer,
// vehicle and location data. Monetary fields (price, mobile fee, discount and
// total) are never accepted from the browser. Zod's object schema strips any
// unknown fields before the controller receives the body.
export const inspectionBookingSchema = z.object({
  packageId: uuid,
  customerName: text(160),
  customerEmail: z.string().trim().email().max(240),
  customerPhone: text(40),
  vehicleMake: nullableText(80),
  vehicleModel: nullableText(120),
  vehicleYear: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1).optional(),
  vehicleRegistration: nullableText(40),
  vehicleVin: nullableText(80),
  vehicleType: nullableText(80),
  country: nullableText(80),
  county: nullableText(120),
  town: nullableText(120),
  inspectionAddress: nullableText(400),
  latitude: z.coerce.number().finite().min(-90).max(90).optional(),
  longitude: z.coerce.number().finite().min(-180).max(180).optional(),
  isMobile: z.boolean().default(true),
  sellerName: nullableText(160),
  sellerPhone: nullableText(40),
  sellerIsDealer: z.boolean().default(false),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  staffId: uuid.optional(),
  notes: z.string().trim().max(4000).optional(),
});
