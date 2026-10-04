import "server-only";
import { azureSpeechSsml, type VoiceStyle } from "@/lib/azure-speech";

export async function synthesizeSpeech(text: string, style: VoiceStyle) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION?.toLowerCase();
  if (!key || !region || !/^[a-z0-9]+$/.test(region)) {
    throw new Error("Azure Speech is not configured.");
  }

  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/ssml+xml",
      "Ocp-Apim-Subscription-Key": key,
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "PitchDeck",
    },
    body: azureSpeechSsml(text, style),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Azure Speech request failed with status ${response.status}.`);
  if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("audio/")) {
    throw new Error("Azure Speech did not return audio.");
  }
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("Azure Speech returned empty audio.");
  return audio;
}
