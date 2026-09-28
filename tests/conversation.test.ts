import test from "node:test";
import assert from "node:assert/strict";
import { introRequestSchema, messageRequestSchema, readRequestSchema } from "../src/lib/conversation.ts";

const messageId = "11111111-1111-4111-8111-111111111111";
const startupId = "22222222-2222-4222-8222-222222222222";

test("accepts a specific introduction note and trims its boundaries", () => {
  const parsed = introRequestSchema.parse({
    startup_id: startupId,
    note: "  I would like to discuss your seed round and market entry plan.  ",
    client_message_id: messageId,
  });
  assert.equal(parsed.note, "I would like to discuss your seed round and market entry plan.");
});

test("rejects vague intro notes and overlong messages", () => {
  assert.equal(introRequestSchema.safeParse({ startup_id: startupId, note: "Interested", client_message_id: messageId }).success, false);
  assert.equal(messageRequestSchema.safeParse({ body: "x".repeat(2_001), client_message_id: messageId }).success, false);
});

test("requires UUID retry keys and monotonic read inputs", () => {
  assert.equal(messageRequestSchema.safeParse({ body: "Hello", client_message_id: "retry-one" }).success, false);
  assert.equal(readRequestSchema.safeParse({ last_read_sequence: -1 }).success, false);
  assert.equal(readRequestSchema.safeParse({ last_read_sequence: 12 }).success, true);
});

test("message content remains plain text data", () => {
  const body = '<script>alert("synthetic secret")</script>\nStill plain text.';
  const parsed = messageRequestSchema.parse({ body, client_message_id: messageId });
  assert.equal(parsed.body, body);
});
