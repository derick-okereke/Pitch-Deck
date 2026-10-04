"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Gauge } from "lucide-react";
import type { PersonaKey } from "@/data/simulator-demo";
import type { SimulatorPersona } from "@/lib/simulator";
import { classifyDevice, mayAttemptFullScene, type DeviceClass } from "@/lib/device-tier";
import { LiteBoardroom } from "./lite-boardroom";
import { FounderVoiceBar } from "./founder-voice-bar";

export type BoardroomProps = {
  activeSpeaker: PersonaKey | "founder" | null;
  amplitude: number;
  playbackActive: boolean;
  allowRecovery: boolean;
  reducedMotion: boolean;
  onFailure: (reason: string) => void;
  onReady: () => void;
};

const EFFECTS_PREFERENCE = "pitch-deck-reduce-effects";

function saveReducedPreference(reduced: boolean) {
  try {
    window.localStorage.setItem(EFFECTS_PREFERENCE, String(reduced));
  } catch {
    // The switch still works for this visit when browser storage is unavailable.
  }
}

export function SimulatorBoardroom({ activeSpeaker, amplitude, founderName = "Founder", personas, playbackActive = false, busy = false, showMicrophone = false }: { activeSpeaker: PersonaKey | "founder" | null; amplitude: number; founderName?: string; personas: SimulatorPersona[]; playbackActive?: boolean; busy?: boolean; showMicrophone?: boolean }) {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("unknown");
  const [eligible, setEligible] = useState(false);
  const [fullRequested, setFullRequested] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const [graphicsFailed, setGraphicsFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [FullScene, setFullScene] = useState<ComponentType<BoardroomProps> | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [note, setNote] = useState("Boardroom ready");

  useEffect(() => {
    let cancelled = false;
    const device = classifyDevice();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const capable = mayAttemptFullScene(device);
    let savedReduced = false;
    try {
      savedReduced = window.localStorage.getItem(EFFECTS_PREFERENCE) === "true";
    } catch {
      // Private browsing can disable storage without disabling the boardroom.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setDeviceClass(device);
      setEligible(capable);
      setReducedMotion(motion.matches);
      setFullRequested(capable && !savedReduced);
      setNote(device === "phone" || device === "tablet" ? "Mobile-optimised scene" : capable && !savedReduced ? "Preparing full experience…" : "Reduced-effects scene");
    });
    const motionChanged = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    motion.addEventListener("change", motionChanged);
    return () => {
      cancelled = true;
      motion.removeEventListener("change", motionChanged);
    };
  }, []);

  useEffect(() => {
    if (!fullRequested) return;
    let cancelled = false;
    import("./webgpu-boardroom").then((module) => {
      if (!cancelled) setFullScene(() => module.WebGPUBoardroom);
    }).catch(() => {
      if (!cancelled) {
        setGraphicsFailed(true);
        setFullReady(false);
        setNote("Full experience interrupted. Retry graphics.");
      }
    });
    return () => { cancelled = true; };
  }, [fullRequested, retryAttempt]);

  const toggleEffects = () => {
    const nextFull = !fullRequested;
    saveReducedPreference(!nextFull);
    setFullReady(false);
    setGraphicsFailed(false);
    setFullRequested(nextFull);
    setNote(nextFull ? "Preparing full experience…" : "Reduced-effects scene");
  };

  const failure = useCallback((reason: string) => {
    setGraphicsFailed(true);
    setFullReady(false);
    setNote(reason);
  }, []);

  const retryGraphics = () => {
    setFullScene(null);
    setGraphicsFailed(false);
    setFullReady(false);
    setNote("Reconnecting full experience…");
    setRetryAttempt((attempt) => attempt + 1);
  };

  const ready = useCallback(() => {
    setFullReady(true);
    setNote("Full experience");
  }, []);

  return (
    <section className="simulator-scene" aria-label="Fictional AI investor panel">
      <div className="scene-toolbar">
        <div><span className="scene-live-dot" />Fictional AI investor panel</div>
        <div className="scene-technology">
          <Gauge size={14} /><span role="status">{note}</span>
          {fullRequested && graphicsFailed && <button type="button" onClick={retryGraphics}>Retry graphics</button>}
          {eligible && <button type="button" onClick={toggleEffects}>{fullRequested ? "Reduce experience" : "Use full experience"}</button>}
        </div>
      </div>
      <div className="scene-stack">
        {/* One room is visible from first paint, while GPU effects initialise or recover. */}
        <LiteBoardroom activeSpeaker={activeSpeaker} amplitude={amplitude} personas={personas} playbackActive={playbackActive} staticMode={reducedMotion || !fullRequested} />
        {fullRequested && !graphicsFailed && FullScene && (
          <FullScene activeSpeaker={activeSpeaker} amplitude={amplitude} playbackActive={playbackActive} allowRecovery={!busy} reducedMotion={reducedMotion} onFailure={failure} onReady={ready} />
        )}
        {showMicrophone && <FounderVoiceBar amplitude={amplitude} founderName={founderName} recording={activeSpeaker === "founder"} />}
      </div>
      <p className="scene-accessible-status" aria-live="polite">
        {activeSpeaker === "founder" ? "You are speaking." : activeSpeaker ? "An AI persona is speaking." : "The panel is waiting."}
        <span className="sr-only"> Device class: {deviceClass}. Selected experience: {fullRequested ? "full" : "lite"}. Graphics: {graphicsFailed ? "interrupted" : fullReady ? "ready" : fullRequested ? "preparing" : "reduced"}.</span>
      </p>
    </section>
  );
}
