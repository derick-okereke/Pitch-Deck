import { z } from "zod";

const clientMessageId = z.string().uuid("The message retry key is invalid.");

export const introRequestSchema = z.object({
  startup_id: z.string().uuid("The startup is invalid."),
  note: z.string().trim().min(20, "Write at least 20 characters so the founder understands your interest.").max(1_000, "Keep the introduction note under 1,000 characters."),
  client_message_id: clientMessageId,
}).strict();

export const messageRequestSchema = z.object({
  body: z.string().trim().min(1, "Write a message before sending.").max(2_000, "Keep the message under 2,000 characters."),
  client_message_id: clientMessageId,
}).strict();

export const readRequestSchema = z.object({
  last_read_sequence: z.number().int().min(0),
}).strict();

export type ConversationMessage = {
  id: string;
  clientMessageId: string;
  senderId: string;
  sequence: number;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  startupId: string;
  startupName: string;
  counterpartName: string;
  counterpartMeta: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  listed: boolean;
};

export type ConversationDetail = {
  id: string;
  startupId: string;
  startupName: string;
  startupTagline: string;
  listed: boolean;
  currentUserId: string;
  currentRole: "founder" | "investor";
  counterpart: {
    name: string;
    meta: string;
    bio: string | null;
    linkedinUrl: string | null;
    domainSignal: boolean;
  };
  messages: ConversationMessage[];
  blocked: boolean;
  blockedByMe: boolean;
  highestSequence: number;
};

export function firstFieldErrors(error: z.ZodError) {
  const output: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !output[key]) output[key] = issue.message;
  }
  return output;
}
