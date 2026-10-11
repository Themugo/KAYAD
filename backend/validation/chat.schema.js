import { z } from "zod";

export const createChatSchema = z.object({
  // Keep both names during client convergence: the canonical contract is
  // recipientId, while older chat entry points still send participantId.
  recipientId: z.string().uuid("Recipient ID must be a UUID").optional(),
  participantId: z.string().uuid("Participant ID must be a UUID").optional(),
  carId: z.string().uuid("Car ID must be a UUID").optional(),
  message: z.string().trim().min(1).max(5000).optional(),
}).refine(v => Boolean(v.recipientId || v.participantId), {
  message: "recipientId is required",
  path: ["recipientId"],
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000).optional(),
  text: z.string().trim().min(1).max(5000).optional(),
  message: z.string().trim().min(1).max(5000).optional(),
  attachments: z.array(z.union([z.string(), z.object({ url: z.string().url(), type: z.string().max(50).optional() })])).max(10).optional(),
}).refine(v => Boolean(v.content || v.text || v.message), { message: "Message content is required" });
