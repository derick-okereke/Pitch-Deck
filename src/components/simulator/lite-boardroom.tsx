"use client";

import type { PersonaKey } from "@/data/simulator-demo";
import { personaInitials, type SimulatorPersona } from "@/lib/simulator";

type ActiveSpeaker = PersonaKey | "founder" | null;

const roomNodes = Array.from({ length: 34 }, (_, index) => ({
  x: 34 + ((index * 83) % 932),
  y: 30 + ((index * 137) % 345),
  delay: -((index % 9) * 0.21),
}));

const chairNodes = Array.from({ length: 72 }, (_, index) => ({
  x: 54 + ((Math.sin(index * 127.1 + 13) * 43758.5453) % 1 + 1) % 1 * 132,
  y: 24 + ((Math.sin(index * 311.7 + 29) * 19642.349) % 1 + 1) % 1 * 186,
}));

const chairContours = [
  [[67, 29], [89, 20], [120, 16], [151, 20], [173, 29], [160, 164], [120, 176], [80, 164], [67, 29]],
  [[58, 164], [90, 157], [120, 154], [150, 157], [182, 164], [166, 205], [120, 215], [74, 205], [58, 164]],
  [[76, 116], [36, 136], [34, 188]], [[164, 116], [204, 136], [206, 188]],
  [[34, 151], [69, 151]], [[171, 151], [206, 151]],
  [[120, 215], [120, 258], [45, 286]], [[120, 258], [195, 286]],
  [[120, 258], [72, 306]], [[120, 258], [168, 306]], [[120, 258], [120, 311]],
];

const chairCloud = chairContours.map((contour) => contour.flatMap(([x, y], index) => {
  if (index === contour.length - 1) return [];
  const [nextX, nextY] = contour[index + 1];
  const steps = Math.max(2, Math.ceil(Math.hypot(nextX - x, nextY - y) / 9));
  return Array.from({ length: steps }, (_, step) => ({ x: x + (nextX - x) * step / steps, y: y + (nextY - y) * step / steps }));
}));

function HolographicChair({ index, active, amplitude, initials }: { index: number; active: boolean; amplitude: number; initials: string }) {
  const clipId = "chair-clip-" + index;
  return (
    <div
      className={"holo-chair chair-" + (index + 1) + (active ? " is-speaking" : "")}
      style={{ "--chair-index": index, "--voice-level": active ? amplitude : 0 } as React.CSSProperties}
    >
      <div className="chair-aura" />
      <svg className="holo-chair-art" viewBox="0 0 240 320" role="presentation">
        <defs>
          <clipPath id={clipId}>
            <path d="M67 29 Q120 5 173 29 L160 164 Q120 180 80 164 Z" />
            <path d="M58 164 Q120 148 182 164 L166 205 Q120 218 74 205 Z" />
          </clipPath>
        </defs>
        <g className="chair-network" clipPath={"url(#" + clipId + ")"}>
          {chairNodes.map((node, nodeIndex) => <circle key={nodeIndex} cx={node.x} cy={node.y} r={nodeIndex % 7 === 0 ? 1.8 : 1.1} />)}
        </g>
        <g className="chair-cloud">
          {chairCloud.map((contour, contourIndex) => <g key={contourIndex}>
            {contour.map((node, nodeIndex) => <circle key={nodeIndex} cx={node.x} cy={node.y} r={nodeIndex % 5 === 0 ? 1.55 : 1.05} />)}
            {contour.map((node, nodeIndex) => nodeIndex % 4 === 0 && contour[nodeIndex + 1]
              ? <line key={"link-" + nodeIndex} x1={node.x} y1={node.y} x2={contour[nodeIndex + 1].x} y2={contour[nodeIndex + 1].y} />
              : null)}
          </g>)}
        </g>
        <text x="120" y="102" textAnchor="middle">{initials}</text>
      </svg>
      <div className="chair-ground-light" />
    </div>
  );
}

export function LiteBoardroom({ activeSpeaker, amplitude, personas, playbackActive = false, staticMode = false }: { activeSpeaker: ActiveSpeaker; amplitude: number; personas: SimulatorPersona[]; playbackActive?: boolean; staticMode?: boolean }) {
  return (
    <div
      className={"lite-boardroom" + (staticMode ? " is-static" : "") + (playbackActive ? " is-previewing" : "")}
      aria-hidden="true"
      style={{ "--voice-level": amplitude } as React.CSSProperties}
    >
      <div className="room-atmosphere" />
      <div className="room-canopy"><i /><i /><i /></div>
      <svg className="room-network" viewBox="0 0 1000 430" preserveAspectRatio="none" role="presentation">
        <g className="room-network-nodes">
          {roomNodes.map((node, index) => <circle key={index} cx={node.x} cy={node.y} r={index % 8 === 0 ? 2.4 : 1.35} style={{ "--node-delay": String(node.delay) + "s" } as React.CSSProperties} />)}
        </g>
      </svg>

      <div className="room-stage">
        <div className="stage-ring" />
      </div>

      <div className="chair-row">
        {personas.map((persona, index) => (
          <div className={"chair-position position-" + (index + 1)} key={persona.persona_key}>
            <HolographicChair index={index} active={activeSpeaker === persona.persona_key} amplitude={amplitude} initials={personaInitials(persona.name)} />
            <strong className="chair-name">{persona.name}</strong>
          </div>
        ))}
      </div>

    </div>
  );
}
