export type PersonaKey = "p1" | "p2" | "p3";

export const simulatorPersonas = [
  { key: "p1" as const, initials: "NI", name: "Nadia Ibe", title: "Early-stage operator", focus: "Problem clarity", voice: "Warm, rigorous" },
  { key: "p2" as const, initials: "TO", name: "Tunde Osei", title: "Commercial investor", focus: "Market evidence", voice: "Direct, analytical" },
  { key: "p3" as const, initials: "LM", name: "Lerato Mbeki", title: "Healthcare strategist", focus: "Execution risk", voice: "Calm, strategic" },
];

export const coachingResources = {
  "customer-interview-basics": "Customer discovery interviews",
  "bottom-up-market-sizing": "Bottom-up market sizing",
  "unit-economics-basics": "Unit economics",
  "competitive-alternatives": "Competitors and the status quo",
  "funding-milestones": "Linking a funding ask to milestones",
  "pitch-structure": "Problem, solution, evidence, ask",
  "stage-appropriate-traction": "Evidence before revenue",
} as const;

export const demoQuestion = {
  personaKey: "p2" as PersonaKey,
  text: "You described 180,000 reachable households. Which employer groups make up that estimate, and what adoption rate are you assuming in the first eighteen months?",
  source: "reach 180,000 households through participating employers in Lagos",
};

export const spokenCategories = [
  { label: "Structure", score: 8, max: 10, note: "The problem, solution, evidence, and ask arrived in a clear order.", evidence: "Korah Health brings neighbourhood diagnostics, clinician consultations, and a predictable monthly care plan into one mobile-first journey." },
  { label: "Clarity", score: 8.5, max: 10, note: "The care journey was concrete and free of unexplained jargon.", evidence: "Last month, a mother we interviewed missed a shift while moving between a lab and a clinic to understand one fever." },
  { label: "Evidence", score: 6.5, max: 10, note: "Pilot letters helped; the reachable-market assumption is still explicitly unverified.", evidence: "Six clinic partners have signed pilot letters, and thirty-eight families completed discovery interviews." },
  { label: "Market", score: 6, max: 10, note: "The answer named employer count and activation, but the estimate still needs a complete bottom-up model.", evidence: "Our current estimate assumes five participating employers in the first year and twenty-two percent household activation." },
  { label: "Business model", score: 8, max: 10, note: "The employer fee and diagnostic service margin were easy to distinguish.", evidence: "We charge employers eight dollars per enrolled household each month." },
  { label: "Ask", score: 7.5, max: 10, note: "The amount, runway, activation, and repeat-use milestones were explicit; a clinic operating target was absent.", evidence: "We are sort of raising two hundred and fifty thousand dollars for an eighteen-month Lagos pilot" },
  { label: "Delivery", score: 7.5, max: 10, note: "The pace was controlled, with three avoidable filler phrases.", evidence: "You know, the first pilot will test whether convenience becomes repeat use." },
];

const pitchTranscript = "Working families in Lagos delay basic care because prices are unclear and one visit often turns into several trips. Last month, a mother we interviewed missed a shift while moving between a lab and a clinic to understand one fever. Korah Health brings neighbourhood diagnostics, clinician consultations, and a predictable monthly care plan into one mobile-first journey. Six clinic partners have signed pilot letters, and thirty-eight families completed discovery interviews. We can reach 180,000 households through participating employers in Lagos, but that is a planning estimate, not verified demand. We charge employers eight dollars per enrolled household each month. Clinics retain diagnostic service revenue, while we earn a twelve percent coordination margin. You know, the first pilot will test whether convenience becomes repeat use. We are sort of raising two hundred and fifty thousand dollars for an eighteen-month Lagos pilot: onboard five employers, activate twenty-two percent of eligible households, and reach forty percent three-month repeat use. Uh, those milestones will tell us whether to expand.";
const answerTranscript = "The first reachable group is employees at mid-sized professional-service and logistics companies in Lagos. Our current estimate assumes five participating employers in the first year and twenty-two percent household activation. We still need to validate that activation rate in the pilot rather than present it as established demand.";
const pitchSeconds = 102;
const answerSeconds = 24;
export const canonicalFillerPhrases = ["you know", "sort of", "kind of", "um", "uh", "erm"] as const;

export function tokenizeSpokenWords(text: string) {
  return (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []).map((token) => token.toLowerCase());
}

export function wordsPerMinute(text: string, durationSeconds: number) {
  return Math.round((tokenizeSpokenWords(text).length * 60) / durationSeconds);
}

export function measureFillers(text: string) {
  const tokens = tokenizeSpokenWords(text);
  const sequences = canonicalFillerPhrases.map((phrase) => ({ phrase, tokens: tokenizeSpokenWords(phrase) }))
    .sort((left, right) => right.tokens.length - left.tokens.length);
  let matchCount = 0;
  let tokenCount = 0;
  const matchedPhrases: string[] = [];

  for (let index = 0; index < tokens.length;) {
    const match = sequences.find((sequence) => sequence.tokens.every((token, offset) => tokens[index + offset] === token));
    if (!match) {
      index += 1;
      continue;
    }
    matchCount += 1;
    tokenCount += match.tokens.length;
    matchedPhrases.push(match.phrase);
    index += match.tokens.length;
  }

  return {
    wordCount: tokens.length,
    matchCount,
    tokenCount,
    matchedPhrases,
    percent: Number(((tokenCount / Math.max(1, tokens.length)) * 100).toFixed(1)),
  };
}

const fillerMeasurement = measureFillers(pitchTranscript + " " + answerTranscript);

export const simulatorReport = {
  sessionScore: Math.round(spokenCategories.reduce((total, category) => total + (category.score / category.max) * 100, 0) / spokenCategories.length),
  deliveryContribution: 7.5,
  pitchPace: wordsPerMinute(pitchTranscript, pitchSeconds),
  answerPace: wordsPerMinute(answerTranscript, answerSeconds),
  fillerMatches: fillerMeasurement.matchCount,
  fillerTokenCount: fillerMeasurement.tokenCount,
  fillerPhrases: Array.from(new Set(fillerMeasurement.matchedPhrases)),
  fillerPercent: fillerMeasurement.percent,
  pitchDuration: "01:42",
  answerDuration: "00:24",
  totalDuration: "02:06",
  recordedAt: "26 Sep 2026",
  profileRevision: 3,
  rubricVersion: "readiness-v1",
  promptVersion: "feedback-v1",
  isFixture: true,
  startedPro: false,
  pitchTranscript,
  answerTranscript,
  priorities: [
    {
      title: "Build the market from the bottom up",
      action: "Name the first five employer groups, eligible households per employer, expected activation, and monthly retention.",
      evidence: "Our current estimate assumes five participating employers in the first year and twenty-two percent household activation.",
    },
    {
      title: "Add one clinic operating target",
      action: "Pair household activation with a measurable turnaround or partner-response target for the pilot.",
      evidence: "Uh, those milestones will tell us whether to expand.",
    },
    {
      title: "State the competitive alternative",
      action: "Explain what a family does today and why the combined care journey is meaningfully better.",
      evidence: null,
    },
  ],
  feedback: [
    {
      personaKey: "p1" as PersonaKey,
      worked: "You made the delayed-care moment tangible through one mother’s missed shift and fragmented care journey.",
      improve: "Open with one affected household and quantify the cost of today’s fragmented journey before describing the platform.",
      action: "Rewrite the first 20 seconds around one specific care episode, then test whether a listener can repeat the problem unaided.",
      evidence: "Last month, a mother we interviewed missed a shift while moving between a lab and a clinic to understand one fever.",
      resources: ["customer-interview-basics", "pitch-structure"] as const,
    },
    {
      personaKey: "p2" as PersonaKey,
      worked: "You separated the employer subscription from the diagnostic service margin without overloading the explanation.",
      improve: "The 180,000-household figure needs a bottom-up path from employer count to enrolled households and active use.",
      action: "Build the estimate from target employers, eligible employees, household size, expected activation, and monthly retention.",
      evidence: "Our current estimate assumes five participating employers in the first year and twenty-two percent household activation.",
      resources: ["bottom-up-market-sizing", "stage-appropriate-traction"] as const,
    },
    {
      personaKey: "p3" as PersonaKey,
      worked: "You acknowledged that the adoption rate is still an assumption instead of presenting it as verified traction.",
      improve: "The ask names household activation and repeat use, but it leaves clinic turnaround and partner-response targets unstated.",
      action: "Add one clinic operating target beside the activation and repeat-use milestones already in the ask.",
      evidence: "We are sort of raising two hundred and fifty thousand dollars for an eighteen-month Lagos pilot",
      resources: ["funding-milestones", "unit-economics-basics"] as const,
    },
  ],
};
