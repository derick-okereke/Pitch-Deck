import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRecordingUpload } from "@/lib/recording-upload-ticket";

export async function storedRecording(request: Request, userId: string, sessionId: string, kind: "pitch" | "answer") {
  const text = await request.text();
  if (text.length > 5000) throw new Error("MEDIA_INVALID");
  const input = JSON.parse(text) as { uploadTicket?: unknown };
  if (typeof input.uploadTicket !== "string") throw new Error("MEDIA_INVALID");
  const ticket = verifyRecordingUpload(input.uploadTicket, process.env.SUPABASE_SECRET_KEY!, userId, sessionId, kind);
  const storage = createAdminClient().storage.from("pitch-audio");
  const { data: info, error } = await storage.info(ticket.storagePath);
  if (error || !info || info.size !== ticket.byteSize || info.contentType?.split(";")[0] !== ticket.mimeType) throw new Error("MEDIA_INVALID");
  const { data: signed, error: signError } = await storage.createSignedUrl(ticket.storagePath, 300);
  if (signError || !signed) throw new Error("AUDIO_ACCESS_FAILED");
  return { ...ticket, audioUrl: signed.signedUrl };
}
