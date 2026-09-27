import "server-only";

export type VoiceStyle = "warm-rigorous" | "direct-analytical" | "calm-strategic";

function voiceId(style: VoiceStyle) {
  const map: Record<VoiceStyle, string | undefined> = {
    "warm-rigorous": process.env.ELEVENLABS_VOICE_WARM,
    "direct-analytical": process.env.ELEVENLABS_VOICE_DIRECT,
    "calm-strategic": process.env.ELEVENLABS_VOICE_CALM,
  };
  const value = map[style];
  if (!value) throw new Error("The requested ElevenLabs voice is not configured.");
  return value;
}

export async function synthesizeSpeech(text: string, style: VoiceStyle) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs is not configured.");

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId(style)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5" }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`ElevenLabs request failed with status ${response.status}.`);
  return response.arrayBuffer();
}
