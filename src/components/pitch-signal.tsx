"use client";

import { useEffect, useRef, useState } from "react";

const nodes = [
  { x: 218, label: "Market", delay: "0.9s" },
  { x: 330, label: "Traction", delay: "1.8s" },
  { x: 442, label: "Ask", delay: "2.7s" },
];

export function PitchSignal() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="signal-wrap" ref={ref} data-active={active}>
      <div className="signal-label-row" aria-hidden="true">
        <span>Pitch readiness</span>
        <span>Illustrative demo</span>
      </div>
      <svg className="pitch-signal" viewBox="0 0 650 400" role="img" aria-labelledby="signal-title signal-desc">
        <title id="signal-title">A pitch moving through three investor focus areas into a readiness score</title>
        <desc id="signal-desc">A founder pitch is assessed for market, traction, and funding ask before resolving into an illustrative readiness score of 78.</desc>
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
          </pattern>
          <linearGradient id="signal-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#4978f0" stopOpacity="0" />
            <stop offset=".18" stopColor="#4978f0" />
            <stop offset=".84" stopColor="#4978f0" />
            <stop offset="1" stopColor="#4978f0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="650" height="400" fill="url(#grid)" />
        <path className="signal-guide" d="M70 220 H567" />
        <path className="signal-wave" d="M72 220 C98 220 99 184 120 184 C140 184 140 256 161 256 C180 256 181 201 205 201 C226 201 231 220 254 220 H560" />
        <g className="founder-node">
          <circle cx="72" cy="220" r="27" />
          <circle cx="72" cy="220" r="5" className="node-core" />
          <text x="72" y="272" textAnchor="middle">LIVE PITCH</text>
        </g>
        {nodes.map((node, index) => (
          <g className="focus-node" key={node.label} style={{ "--node-delay": node.delay } as React.CSSProperties}>
            <circle cx={node.x} cy="220" r="38" className="node-ring" />
            <circle cx={node.x} cy="220" r="7" className="node-core" />
            <text x={node.x} y="290" textAnchor="middle">{`0${index + 1}  ${node.label.toUpperCase()}`}</text>
          </g>
        ))}
        <g className="score-node">
          <circle cx="565" cy="220" r="66" className="score-back" />
          <circle cx="565" cy="220" r="66" className="score-progress" pathLength="100" />
          <text x="565" y="211" textAnchor="middle" className="score-value">78</text>
          <text x="565" y="238" textAnchor="middle" className="score-caption">READINESS</text>
        </g>
        <g className="evidence-ticks">
          <path d="M522 126 l7 7 13-16" />
          <path d="M557 112 l7 7 13-16" />
          <path d="M592 126 l7 7 13-16" />
        </g>
        <text x="72" y="56" className="diagram-kicker">ONE PITCH · THREE PERSPECTIVES</text>
        <text x="72" y="88" className="diagram-title">From pitch to introduction.</text>
      </svg>
      <div className="signal-mobile" aria-hidden="true">
        <span className="mobile-founder">Pitch</span><i />
        {nodes.map((node) => <span key={node.label}>{node.label.slice(0, 1)}</span>)}
        <i /><strong>78</strong>
      </div>
    </div>
  );
}

