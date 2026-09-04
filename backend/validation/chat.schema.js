import { z } from "zod";

export const createChatSchema = z.object({
  recipientId: z.string().uuid("Recipient ID must be a UUID"),
  carId: z.string().uuid("Car ID must be a UUID").optional(),
  message: z.string().min(1).max(5000).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  text: z.string().min(1).max(5000).optional(),
  message: z.string().min(1).max(5000).optional(),
  attachments: z.array(z.union([z.string(), z.object({ url: z.string().url(), type: z.string().max(50).optional() })])).max(10).optional(),
}).refine(v => Boolean(v.content || v.text || v.message), { message: "Message content is required" });
