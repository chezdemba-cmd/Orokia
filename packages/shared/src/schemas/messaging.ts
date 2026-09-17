import { z } from "zod";

export const createConversationSchema = z.object({
  recipientProfileId: z.string(),
  message: z.string().min(1),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  corps: z.string().min(1),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
