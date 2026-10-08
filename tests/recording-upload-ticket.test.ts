import assert from "node:assert/strict";
import test from "node:test";
import { recordingUploadSchema, signRecordingUpload, verifyRecordingUpload } from "../src/lib/recording-upload-ticket.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const ticket = {
  kind: "pitch" as const, mimeType: "audio/webm" as const, byteSize: 1024,
  durationMs: 30_000, stateVersion: 1, questionIndex: null,
  userId, sessionId, storagePath: `${userId}/${sessionId}/recording.webm`, expiresAt: 2000,
};

test("upload credentials are bound to the authenticated user, session, and segment", () => {
  const token = signRecordingUpload(ticket, "test-secret");
  assert.deepEqual(verifyRecordingUpload(token, "test-secret", userId, sessionId, "pitch", 1000), ticket);
  assert.throws(() => verifyRecordingUpload(token, "test-secret", otherId, sessionId, "pitch", 1000));
  assert.throws(() => verifyRecordingUpload(token, "test-secret", userId, otherId, "pitch", 1000));
  assert.throws(() => verifyRecordingUpload(token, "test-secret", userId, sessionId, "answer", 1000));
});

test("tampered, expired, wrong-key, and oversized tickets cannot authorize processing", () => {
  const token = signRecordingUpload(ticket, "test-secret");
  const forgedBody = Buffer.from(JSON.stringify({ ...ticket, byteSize: 1 })).toString("base64url");
  assert.throws(() => verifyRecordingUpload(`${forgedBody}.${token.split(".")[1]}`, "test-secret", userId, sessionId, "pitch", 1000));
  assert.throws(() => verifyRecordingUpload(token, "different-secret", userId, sessionId, "pitch", 1000));
  assert.throws(() => verifyRecordingUpload(token, "test-secret", userId, sessionId, "pitch", 2000));
  assert.throws(() => verifyRecordingUpload("x".repeat(4097), "test-secret", userId, sessionId, "pitch", 1000));
});

test("metadata rejects oversized audio, unsupported types, and invalid segment duration or question", () => {
  const metadata = {
    kind: ticket.kind, mimeType: ticket.mimeType, byteSize: ticket.byteSize,
    durationMs: ticket.durationMs, stateVersion: ticket.stateVersion, questionIndex: ticket.questionIndex,
  };
  assert.ok(recordingUploadSchema.safeParse(metadata).success);
  for (const change of [{ byteSize: 20 * 1024 * 1024 + 1 }, { mimeType: "text/html" }, { durationMs: 29_999 }, { questionIndex: 1 }]) {
    assert.equal(recordingUploadSchema.safeParse({ ...metadata, ...change }).success, false);
  }
  assert.ok(recordingUploadSchema.safeParse({ ...metadata, kind: "answer", questionIndex: 2, durationMs: 5000 }).success);
  assert.equal(recordingUploadSchema.safeParse({ ...metadata, kind: "answer", questionIndex: null, durationMs: 5000 }).success, false);
});
