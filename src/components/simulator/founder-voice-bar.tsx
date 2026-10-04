"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { personaInitials } from "@/lib/simulator";

const SAMPLE_COUNT = 44;
const silentSamples = Array<number>(SAMPLE_COUNT).fill(0);

export function FounderVoiceBar({ amplitude, founderName, recording }: { amplitude: number; founderName: string; recording: boolean }) {
  const levelRef = useRef(0);
  const [samples, setSamples] = useState(silentSamples);

  useEffect(() => {
    levelRef.current = Math.min(1, Math.max(0, amplitude));
  }, [amplitude]);

  useEffect(() => {
    if (!recording) return;
    // A short history of the real microphone level, with no simulated playback signal.
    let history = silentSamples;
    const timer = window.setInterval(() => {
      history = [...history.slice(1), levelRef.current];
      setSamples(history);
    }, 60);
    return () => window.clearInterval(timer);
  }, [recording]);

  return (
    <div className={"founder-voice-bar" + (recording ? " is-recording" : "")} style={{ "--voice-level": recording ? Math.min(1, Math.max(0, amplitude)) : 0 } as CSSProperties} role="group" aria-label={recording ? "Your microphone is recording" : "Your microphone is ready for recording"}>
      <span className="founder-voice-avatar" aria-label={founderName}>{personaInitials(founderName)}</span>
      <div className="founder-voice-signal">
        <div className="founder-voice-caption"><strong>Your microphone</strong><span>{recording ? "Recording" : "Starting…"}</span></div>
        <svg viewBox="0 0 352 44" preserveAspectRatio="none" role="img" aria-label={recording ? "Live microphone waveform" : "Microphone idle"}>
          {(recording ? samples : silentSamples).map((sample, index) => {
            const height = 4 + Math.sqrt(sample) * 36;
            return <rect key={index} x={index * 8 + 2} y={(44 - height) / 2} width="4" height={height} rx="2" />;
          })}
        </svg>
      </div>
    </div>
  );
}
