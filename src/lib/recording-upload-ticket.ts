import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const recordingUploadSchema = z.object({
  kind: z.enum(["pitch", "answer"]),
  mimeType: z.enum(["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-m4a"]),
  byteSize: z.number().int().min(1).max(20 * 1024 * 1024),
  durationMs: z.number().int(),
  stateVersion: z.number().int().positive(),
  questionIndex: z.number().int().min(1).max(2).nullable(),
}).strict().refine((value) => value.kind === "pitch"
  ? value.questionIndex === null && value.durationMs >= 30_000 && value.durationMs <= 300_000
  : value.questionIndex !== null && value.durationMs >= 5_000 && value.durationMs <= 90_000);

const ticketSchema = recordingUploadSchema.safeExtend({
  userId: z.uuid(), sessionId: z.uuid(), storagePath: z.string(), expiresAt: z.number().int(),
});
export type RecordingUploadTicket = z.infer<typeof ticketSchema>;

export function signRecordingUpload(ticket: RecordingUploadTicket, secret: string) {
  const body = Buffer.from(JSON.stringify(ticketSchema.parse(ticket))).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyRecordingUpload(token: string, secret: string, userId: string, sessionId: string, kind: "pitch" | "answer", now = Date.now()) {
  if (token.length > 4096) throw new Error("MEDIA_INVALID");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("MEDIA_INVALID");
  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("MEDIA_INVALID");
  const ticket = ticketSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString()));
  if (ticket.userId !== userId || ticket.sessionId !== sessionId || ticket.kind !== kind || ticket.expiresAt <= now
    || !ticket.storagePath.startsWith(`${userId}/${sessionId}/`)) throw new Error("MEDIA_INVALID");
  return ticket;
}
