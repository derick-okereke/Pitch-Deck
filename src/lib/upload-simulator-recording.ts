"use client";

import { createClient } from "@/lib/supabase/client";

export async function uploadSimulatorRecording(sessionId: string, blob: Blob, input: {
  kind: "pitch" | "answer"; durationMs: number; stateVersion: number; questionIndex: number | null;
}) {
  const mimeType = blob.type.split(";")[0].toLowerCase();
  const response = await fetch(`/api/v1/simulations/${sessionId}/recording-upload`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, mimeType, byteSize: blob.size }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Audio upload could not start.");
  const { storagePath, token, uploadTicket } = payload.data;
  const { error } = await createClient().storage.from("pitch-audio").uploadToSignedUrl(storagePath, token, blob, { contentType: mimeType });
  if (error) throw new Error("Audio could not be uploaded. Please try again.");
  return uploadTicket as string;
}

export async function recoverSimulatorVersion(sessionId: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/v1/simulations/${sessionId}/recording-upload`, { cache: "no-store" });
    const payload = await response.json();
    return response.ok && Number.isInteger(payload.data?.stateVersion) ? payload.data.stateVersion : null;
  } catch {
    return null;
  }
}
