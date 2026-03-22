import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SQL_EXPERT_PROMPT } from "../../prompts/sql";
import type { ChatRequestBody } from "./chat.schema";

/**
 * Stream chat completion using the SQL expert model.
 */
export async function streamChat(messages: ChatRequestBody["messages"]) {
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: SQL_EXPERT_PROMPT,
    messages,
  });
  return result.toUIMessageStreamResponse();
}
