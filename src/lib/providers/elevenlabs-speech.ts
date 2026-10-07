import "server-only";
import { elevenLabsVoiceEnvName, type VoiceStyle } from "@/lib/elevenlabs-speech";

export async function synthesizeSpeech(text: string, style: VoiceStyle) {
  const key = process.env.ELEVENLABS_API_KEY;
  const modelId = process.env.ELEVENLABS_MODEL_ID;
  const voiceId = process.env[elevenLabsVoiceEnvName(style)];
  if (!key || !modelId || !voiceId || !/^[a-zA-Z0-9]+$/.test(voiceId)) {
    throw new Error("ElevenLabs speech is not configured.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
      "xi-api-key": key,
    },
    body: JSON.stringify({ text, model_id: modelId }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`ElevenLabs speech request failed with status ${response.status}.`);
  if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("audio/")) {
    throw new Error("ElevenLabs did not return audio.");
  }
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("ElevenLabs returned empty audio.");
  return audio;
}
