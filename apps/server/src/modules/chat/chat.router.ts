import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { chatRequestBodySchema } from "./chat.schema";
import { streamChat } from "./chat.service";

export const chatRouter = new Hono()
  .post("/", zValidator("json", chatRequestBodySchema), async (c) => {
    try {
      const { messages } = c.req.valid("json");
      const response = await streamChat(messages);
      return response;
    } catch (error) {
      console.error("Chat error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
