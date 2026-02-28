import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const chatRequestBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message is required"),
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
