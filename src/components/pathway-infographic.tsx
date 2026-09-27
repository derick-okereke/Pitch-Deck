const steps = [
  {
    number: "01",
    title: "Share your idea",
    body: "Build a founder profile with your pitch and the details investors actually look for.",
  },
  {
    number: "02",
    title: "Practise with AI investors",
    body: "Pitch to three fictional investors matched to your field. Get feedback on pacing, filler words, and delivery.",
  },
  {
    number: "03",
    title: "See your Pitch-Readiness Score",
    body: "Get a detailed breakdown of what worked, what didn’t, and exactly how to improve.",
  },
  {
    number: "04",
    title: "Connect with real investors",
    body: "Publish a reviewed profile so investors can request an introduction. Founders can always reply for free.",
  },
];

function StageGraphic({ stage }: { stage: number }) {
  const fillY = [120, 80, 46, 10][stage];
  const figure = [
    <g key="one" transform="translate(54, 94)">
      <circle cx="5" cy="3" r="3.2" /><rect x="6" y="1.5" width="6" height="2.5" rx="1" transform="rotate(-20 6 1.5)" />
      <path d="M2 7 C2 6 4 6 5 6 C6 6 8 6 8 7 L8 16 C8 17 7 17 5 17 C3 17 2 17 2 16 Z" /><rect x="3" y="16" width="2.2" height="10" /><rect x="6" y="16" width="2.2" height="10" /><path d="M6 8 L9 4 L10 5 L7 10 Z" />
    </g>,
    <g key="two" transform="translate(74, 9)">
      <circle cx="6" cy="15" r="3" /><path d="M2 0 C2 0 4 0 5 1 L5 12 L3 12 Z" /><path d="M10 0 C10 0 8 0 7 1 L7 12 L9 12 Z" />
      <path d="M3 18 C3 17 5 17 6 17 C7 17 9 17 9 18 L9 29 C9 30 7 30 6 30 C5 30 3 30 3 29 Z" /><rect x="4" y="29" width="2" height="12" transform="rotate(3 4 29)" /><rect x="6.5" y="29" width="2" height="13" transform="rotate(-4 6.5 29)" />
    </g>,
    <g key="three" transform="translate(68, -26)">
      <circle cx="14" cy="4" r="3.2" /><path d="M11 8 C11 7 13 7 14 7 C15 7 17 7 17 8 L16 19 C16 20 14 20 13 20 C12 20 11 20 11 19 Z" transform="rotate(12 14 14)" />
      <path d="M10 19 L6 30 L8 31 L12 21 Z" /><path d="M15 19 L19 26 L22 35 L20 36 L17 27 L13 20 Z" /><path d="M16 9 L21 16 L19 17 L15 11 Z" /><path d="M11 10 L7 17 L5 16 L9 10 Z" />
    </g>,
    <g key="four" transform="translate(74, -26)">
      <circle cx="6" cy="4" r="3.2" /><path d="M3 8 C3 7 5 7 6 7 C7 7 9 7 9 8 L9 20 C9 21 8 21 6 21 C4 21 3 21 3 20 Z" />
      <rect x="4" y="20" width="2.2" height="16" /><rect x="6.8" y="20" width="2.2" height="16" /><rect x="7" y="4" width="10" height="2.5" rx="1" transform="rotate(-15 7 4)" /><path d="M7 10 L11 7 L12 8 L8 12 Z" />
    </g>,
  ][stage];

  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <defs><clipPath id={`path-stage-${stage}`}><circle cx="80" cy="80" r="70" /></clipPath></defs>
      <circle cx="80" cy="80" r="70" className="pathway-circle" />
      <rect x="10" y={fillY} width="140" height={160 - fillY} className="pathway-fill" clipPath={`url(#path-stage-${stage})`} />
      <g className="pathway-figure">{figure}</g>
    </svg>
  );
}

export function PathwayInfographic() {
  return (
    <div className="pathway-infographic">
      <div className="pathway-visuals">
        {steps.map((step, index) => <div className="pathway-stage" key={step.number}><StageGraphic stage={index} /></div>)}
      </div>
      <div className="pathway-line" aria-hidden="true">{steps.map((step) => <i key={step.number} />)}</div>
      <div className="pathway-copy">
        {steps.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
