import { z } from "zod";

// Canonical public inspector onboarding contract. This matches the payload
// produced by src/components/OnboardingFlow.tsx and consumed by the live
// inspectorApplicationController rather than the retired document-upload form.
export const submitApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(40),
  idNumber: z.string().trim().min(3).max(100),
  location: z.string().trim().min(1).max(200),
  yearsOfExperience: z.coerce.number().finite().min(0).max(80),
  specialties: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  certifications: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  toolsAvailable: z.string().trim().max(1000).optional(),
  preferredRegions: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  cvUrl: z.string().url().optional(),
  certificationDocs: z.array(z.string().url()).max(20).optional(),
});

export const approveApplicationSchema = z.object({
  assignedSpecialty: z.string().trim().min(1).max(100).optional(),
  assignedRegion: z.string().trim().min(1).max(100).optional(),
  reviewNotes: z.string().trim().max(1000).optional(),
});

export const rejectApplicationSchema = z.object({
  reviewNotes: z.string().trim().max(1000).optional(),
});
