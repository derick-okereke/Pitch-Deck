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
        <g className="chair-frame">
          <path d="M67 29 Q120 5 173 29 L160 164 Q120 180 80 164 Z" />
          <path d="M58 164 Q120 148 182 164 L166 205 Q120 218 74 205 Z" />
          <path d="M76 116 L36 136 L34 188 M164 116 L204 136 L206 188" />
          <path d="M34 151 H69 M171 151 H206" />
          <path d="M113 207 H127 V258 H113 Z" />
          <path d="M120 258 L45 286 M120 258 L195 286 M120 258 L72 306 M120 258 L168 306 M120 258 L120 311" />
          <circle cx="43" cy="288" r="5" /><circle cx="197" cy="288" r="5" /><circle cx="70" cy="307" r="5" /><circle cx="170" cy="307" r="5" /><circle cx="120" cy="313" r="5" />
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
      <div className="room-wall-panels"><i /><i /><i /></div>
      <svg className="room-network" viewBox="0 0 1000 430" preserveAspectRatio="none" role="presentation">
        <g className="room-network-nodes">
          {roomNodes.map((node, index) => <circle key={index} cx={node.x} cy={node.y} r={index % 8 === 0 ? 2.4 : 1.35} style={{ "--node-delay": String(node.delay) + "s" } as React.CSSProperties} />)}
        </g>
      </svg>

      <div className="room-stage">
        <div className="stage-ring ring-1" /><div className="stage-ring ring-2" /><div className="stage-ring ring-3" />
      </div>

      <div className="chair-row">
        {personas.map((persona, index) => (
          <div className={"chair-position position-" + (index + 1)} key={persona.persona_key}>
            <HolographicChair index={index} active={activeSpeaker === persona.persona_key} amplitude={amplitude} initials={personaInitials(persona.name)} />
            <div className="chair-identity"><strong>{persona.name}</strong><small>{persona.focus}</small></div>
          </div>
        ))}
      </div>

    </div>
  );
}
