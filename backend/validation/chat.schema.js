import { z } from "zod";

export const createChatSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  carId: z.string().optional(),
  message: z.string().min(1, "Message cannot be empty").max(5000).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
  attachments: z.array(z.string()).optional(),
});
