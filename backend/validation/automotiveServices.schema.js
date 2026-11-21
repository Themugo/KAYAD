import { z } from 'zod';

const uuid = z.string().uuid();
const code = z.string().trim().min(1).max(60);
const note = z.string().trim().min(1).max(2000);

export const declareCapabilitySchema = z.object({
  category: code,
  subcategory: code.nullable().optional(),
  vehicleMakes: z.array(z.string().trim().min(1).max(60)).max(60).optional(),
  allMakes: z.boolean().optional(),
  powertrains: z.array(code).max(5).optional(),
  staffId: uuid.nullable().optional(),
  evidenceCredentialId: uuid.nullable().optional(),
  travelsToCustomer: z.boolean().optional(),
}).strict();

export const inviteStaffSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.string().trim().min(1).max(60).optional(),
}).strict();

export const requestAffiliationSchema = z.object({
  providerId: uuid,
  role: z.string().trim().min(1).max(60).optional(),
}).strict();

export const adminProviderDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_info', 'suspend', 'reinstate']),
  route: z.enum(['premises', 'alternative']).optional(),
  notes: note.optional(),
  reason: note.optional(),
}).strict();

export const adminCredentialDecisionSchema = z.object({
  decision: z.enum(['verify', 'reject']),
  notes: note.optional(),
}).strict();

export const adminCapabilityDecisionSchema = z.object({
  decision: z.enum(['verify', 'revoke']),
  notes: note.optional(),
}).strict();

// Evidence documents must be a KAYAD upload path or an https URL: never javascript:, data: or protocol-relative.
const safeDocUrl = z.string().trim().max(2048).refine((u) => /^https:\/\//i.test(u) || (/^\/(?!\/)/.test(u) && !/\s/.test(u)), 'documentUrl must be an https URL or an upload path');
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, 'Use a YYYY-MM-DD date');

export const addCredentialSchema = z.object({
  type: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(160),
  issuingBody: z.string().trim().min(1).max(160).optional(),
  certificateNumber: z.string().trim().min(1).max(80).optional(),
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  documentUrl: safeDocUrl.optional(),
}).strict();
