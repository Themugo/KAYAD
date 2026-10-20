// Stage 5F.16 — request schemas for the garage organization API. All strict: unknown keys (organizationId, role escalation
// fields, status fields, actor ids) are REJECTED rather than ignored, so a client cannot smuggle authority into a request.
import { z } from 'zod';

const uuid = z.string().uuid();
const name = z.string().trim().min(2).max(120);
const optText = (n) => z.string().trim().max(n).nullable().optional();
export const ACCESS_ROLES = ['org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer'];
export const TITLES = ['lead_engineer', 'senior_inspector', 'junior_inspector', 'field_technician', 'workshop_technician', 'quality_reviewer'];

export const branchCreateSchema = z.object({
  name, county: optText(120), town: optText(120), address: optText(300), phone: optText(40),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(), longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  isHeadOffice: z.boolean().optional(),
}).strict();

export const branchUpdateSchema = z.object({
  name: name.optional(), county: optText(120), town: optText(120), address: optText(300), phone: optText(40),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(), longitude: z.number().finite().min(-180).max(180).nullable().optional(),
}).strict().refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const branchStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'closed']),
  reason: z.string().trim().max(500).optional(),
}).strict();

export const memberInviteSchema = z.object({
  email: z.string().trim().email().max(254),
  accessRole: z.enum(ACCESS_ROLES),
  title: z.enum(TITLES).optional(),
  branchId: uuid.nullable().optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
}).strict();

export const memberChangeSchema = z.object({
  accessRole: z.enum(ACCESS_ROLES).optional(),
  title: z.enum(TITLES).optional(),
  branchId: uuid.nullable().optional(),
}).strict().refine((o) => Object.keys(o).length > 0, { message: 'Nothing to change' });

export const memberStatusSchema = z.object({
  action: z.enum(['suspend', 'reactivate', 'revoke']),
  reason: z.string().trim().max(500).optional(),
}).strict();

export const leaveSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();

export const bookingRouteSchema = z.object({ branchId: uuid.nullable() }).strict();
export const bookingAssignSchema = z.object({ staffId: uuid }).strict();
export const bookingTransitionSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'travel', 'start', 'complete', 'no_show']),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const reportQuerySchema = z.object({
  branchId: uuid.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

export const bookingListQuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  branchId: z.union([uuid, z.literal('unrouted')]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();
