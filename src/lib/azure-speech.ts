export type VoiceStyle = "warm-rigorous" | "direct-analytical" | "calm-strategic";

const voices: Record<VoiceStyle, { locale: string; name: string }> = {
  "warm-rigorous": { locale: "en-NG", name: "en-NG-EzinneNeural" },
  "direct-analytical": { locale: "en-NG", name: "en-NG-AbeoNeural" },
  "calm-strategic": { locale: "en-GB", name: "en-GB-LibbyNeural" },
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] ?? character);
}

export function azureSpeechSsml(text: string, style: VoiceStyle) {
  const voice = voices[style];
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.locale}"><voice name="${voice.name}">${escapeXml(text)}</voice></speak>`;
}

export function azureVoiceName(style: VoiceStyle) {
  return voices[style].name;
}
