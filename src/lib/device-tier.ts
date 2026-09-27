export type DeviceClass = "phone" | "tablet" | "desktop" | "unknown";
export type ExperienceTier = "full" | "lite";

type NavigatorWithHints = Navigator & {
  userAgentData?: { mobile?: boolean; platform?: string };
};

export type DeviceSignals = {
  userAgent: string;
  platform: string;
  mobileHint?: boolean;
  maxTouchPoints: number;
  finePointer: boolean;
};

export function classifyDeviceSignals({ userAgent, platform, mobileHint, maxTouchPoints, finePointer }: DeviceSignals): DeviceClass {
  const agent = userAgent.toLowerCase();
  const normalizedPlatform = platform.toLowerCase();
  const hasTouch = maxTouchPoints > 1;

  if (mobileHint === true || /iphone|ipod|windows phone|android.+mobile|mobile safari/.test(agent)) {
    return "phone";
  }

  if (/ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/.test(agent)) return "tablet";
  if (normalizedPlatform.includes("mac") && hasTouch) return "tablet";

  const desktopPlatform = /win|mac|linux|cros/.test(normalizedPlatform) || /windows nt|macintosh|x11|cros/.test(agent);
  return desktopPlatform && finePointer && !hasTouch ? "desktop" : "unknown";
}

export function classifyDevice(): DeviceClass {
  if (typeof window === "undefined") return "unknown";
  const nav = navigator as NavigatorWithHints;
  return classifyDeviceSignals({
    userAgent: navigator.userAgent,
    platform: nav.userAgentData?.platform || navigator.platform || "",
    mobileHint: nav.userAgentData?.mobile,
    maxTouchPoints: navigator.maxTouchPoints,
    finePointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  });
}

export function mayAttemptFullScene(deviceClass: DeviceClass): boolean {
  if (typeof window === "undefined") return false;
  return deviceClass === "desktop"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && "gpu" in navigator;
}

export function getInitialExperienceTier(): ExperienceTier {
  return mayAttemptFullScene(classifyDevice()) ? "full" : "lite";
}
