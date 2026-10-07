import assert from "node:assert/strict";
import test from "node:test";
import { elevenLabsVoiceEnvName } from "../src/lib/elevenlabs-speech.ts";

test("maps each panel style to its configured ElevenLabs voice", () => {
  assert.equal(elevenLabsVoiceEnvName("warm-rigorous"), "ELEVENLABS_VOICE_WARM");
  assert.equal(elevenLabsVoiceEnvName("direct-analytical"), "ELEVENLABS_VOICE_DIRECT");
  assert.equal(elevenLabsVoiceEnvName("calm-strategic"), "ELEVENLABS_VOICE_CALM");
});
