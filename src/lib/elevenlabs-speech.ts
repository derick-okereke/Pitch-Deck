export type VoiceStyle = "warm-rigorous" | "direct-analytical" | "calm-strategic";

const voiceEnvNames: Record<VoiceStyle, string> = {
  "warm-rigorous": "ELEVENLABS_VOICE_WARM",
  "direct-analytical": "ELEVENLABS_VOICE_DIRECT",
  "calm-strategic": "ELEVENLABS_VOICE_CALM",
};

export function elevenLabsVoiceEnvName(style: VoiceStyle) {
  return voiceEnvNames[style];
}
