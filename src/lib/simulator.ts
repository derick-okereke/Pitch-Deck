import { z } from "zod";

export const personaKeySchema = z.enum(["p1", "p2", "p3"]);
export const voiceStyleSchema = z.enum(["warm-rigorous", "direct-analytical", "calm-strategic"]);

export const simulatorPersonaSchema = z.object({
  persona_key: personaKeySchema,
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(5).max(120),
  focus: z.string().trim().min(20).max(240),
  voice_style: voiceStyleSchema,
}).strict();

export const simulatorPersonasSchema = z.object({
  schema_version: z.literal("1"),
  personas: z.array(simulatorPersonaSchema).length(3),
}).strict().superRefine((value, context) => {
  if (new Set(value.personas.map((persona) => persona.persona_key)).size !== 3) {
    context.addIssue({ code: "custom", path: ["personas"], message: "Personas must contain the three unique keys." });
  }
  if (new Set(value.personas.map((persona) => persona.name.toLocaleLowerCase())).size !== 3) {
    context.addIssue({ code: "custom", path: ["personas"], message: "Persona names must be unique." });
  }
  if (new Set(value.personas.map((persona) => persona.focus.toLocaleLowerCase())).size !== 3) {
    context.addIssue({ code: "custom", path: ["personas"], message: "Persona focuses must be meaningfully distinct." });
  }
});

export type SimulatorPersona = z.infer<typeof simulatorPersonaSchema>;

export const spokenCategoryKeys = ["clarity", "market", "traction", "team", "business_model", "competition", "delivery"] as const;
export const resourceIds = ["customer-interview-basics", "bottom-up-market-sizing", "unit-economics-basics", "competitive-alternatives", "funding-milestones", "pitch-structure", "stage-appropriate-traction"] as const;
export const canonicalFillerPhrases = ["you know", "sort of", "kind of", "um", "uh", "erm"] as const;

export const simulatorQuestionSchema = z.object({
  question_index: z.number().int().min(1).max(2),
  persona_key: personaKeySchema,
  question: z.string().trim().min(20).max(400),
  source_quote: z.string().trim().min(1).max(240),
  focus_category: z.enum(["problem", "solution", "market", "traction", "business_model", "ask"]),
}).strict();

export const simulatorQuestionsSchema = z.object({
  schema_version: z.literal("1"),
  questions: z.array(simulatorQuestionSchema).length(2),
}).strict().superRefine((value, context) => {
  if (new Set(value.questions.map((question) => question.question_index)).size !== 2) {
    context.addIssue({ code: "custom", path: ["questions"], message: "Question indexes must be unique." });
  }
  if (new Set(value.questions.map((question) => question.persona_key)).size !== 2) {
    context.addIssue({ code: "custom", path: ["questions"], message: "Exactly two different personas must ask questions." });
  }
});

const spokenEvidenceSchema = z.object({
  segment: z.enum(["pitch", "answer_1", "answer_2"]),
  quote: z.string().trim().min(1).max(240),
  start_ms: z.number().int().nonnegative().nullable(),
  end_ms: z.number().int().nonnegative().nullable(),
}).strict();

const feedbackItemSchema = z.object({
  observation: z.string().trim().min(40).max(500),
  evidence: spokenEvidenceSchema.nullable(),
}).strict();

export const simulatorFeedbackSchema = z.object({
  schema_version: z.literal("1"),
  categories: z.array(z.object({
    key: z.enum(spokenCategoryKeys),
    rating: z.number().int().min(0).max(4),
    rationale: z.string().trim().min(40).max(600),
    evidence: z.array(spokenEvidenceSchema).max(3),
    next_step: z.string().trim().min(20).max(400),
  }).strict()).length(7),
  persona_feedback: z.array(z.object({
    persona_key: personaKeySchema,
    what_worked: z.array(feedbackItemSchema).min(1).max(3),
    what_didnt: z.array(feedbackItemSchema).min(1).max(3),
    how_to_improve: z.array(z.object({ action: z.string().trim().min(30).max(400), why: z.string().trim().min(30).max(300) }).strict()).min(2).max(4),
    resources: z.array(z.object({ resource_id: z.enum(resourceIds), reason: z.string().trim().min(30).max(300) }).strict()).min(1).max(2),
  }).strict()).length(3),
}).strict().superRefine((value, context) => {
  if (new Set(value.categories.map((category) => category.key)).size !== spokenCategoryKeys.length) {
    context.addIssue({ code: "custom", path: ["categories"], message: "All seven category keys are required once." });
  }
  value.categories.forEach((category, index) => {
    if (category.rating > 0 && category.evidence.length === 0) {
      context.addIssue({ code: "custom", path: ["categories", index, "evidence"], message: "A positive rating requires evidence." });
    }
  });
  if (new Set(value.persona_feedback.map((feedback) => feedback.persona_key)).size !== 3) {
    context.addIssue({ code: "custom", path: ["persona_feedback"], message: "All three personas are required once." });
  }
  value.persona_feedback.forEach((feedback, index) => {
    const items = [...feedback.what_worked, ...feedback.what_didnt];
    if (!items.some((item) => item.evidence !== null)) {
      context.addIssue({ code: "custom", path: ["persona_feedback", index], message: "Each persona needs at least one evidence-backed note." });
    }
  });
});

export type SimulatorQuestion = z.infer<typeof simulatorQuestionSchema>;
export type SimulatorFeedback = z.infer<typeof simulatorFeedbackSchema>;

export function feedbackQuoteCandidates(transcripts: Record<"pitch" | "answer_1" | "answer_2", string>) {
  const candidates: Array<{ segment: keyof typeof transcripts; quote: string }> = [];
  for (const segment of ["pitch", "answer_1", "answer_2"] as const) {
    const transcript = transcripts[segment];
    for (const sentence of transcript.split(/(?<=[.!?])\s+/u)) {
      const words = [...sentence.matchAll(/\S+/gu)];
      let start = 0;
      while (start < words.length) {
        let end = start + 1;
        while (end < words.length && words[end][0].length + words[end].index - words[start].index <= 200) end += 1;
        const first = words[start];
        const last = words[end - 1];
        const quote = sentence.slice(first.index, last.index + last[0].length);
        if (quote.length <= 240 && !candidates.some((candidate) => candidate.segment === segment && candidate.quote === quote)) {
          candidates.push({ segment, quote });
        }
        start = end;
      }
    }
  }
  return candidates;
}

export function tokenizeSpokenWords(text: string) {
  return (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []).map((token) => token.toLocaleLowerCase());
}

export function wordsPerMinute(text: string, durationSeconds: number) {
  return durationSeconds > 0 ? Math.round((tokenizeSpokenWords(text).length * 60) / durationSeconds) : 0;
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
    if (!match) { index += 1; continue; }
    matchCount += 1;
    tokenCount += match.tokens.length;
    matchedPhrases.push(match.phrase);
    index += match.tokens.length;
  }
  return { wordCount: tokens.length, matchCount, tokenCount, matchedPhrases, percent: Number(((tokenCount / Math.max(1, tokens.length)) * 100).toFixed(1)) };
}

const spokenWeights: Record<(typeof spokenCategoryKeys)[number], number> = {
  clarity: 20, market: 15, traction: 20, team: 15, business_model: 10, competition: 10, delivery: 10,
};

export function validateAndScoreSimulatorFeedback(input: unknown, transcripts: Record<"pitch" | "answer_1" | "answer_2", string>) {
  const feedback = simulatorFeedbackSchema.parse(input);
  const evidence = feedback.categories.flatMap((category) => category.evidence)
    .concat(feedback.persona_feedback.flatMap((persona) => [...persona.what_worked, ...persona.what_didnt].flatMap((item) => item.evidence ? [item.evidence] : [])));
  for (const item of evidence) {
    if (!transcripts[item.segment].includes(item.quote)) throw new Error(`Feedback evidence is not present in ${item.segment}.`);
    if ((item.start_ms === null) !== (item.end_ms === null) || (item.start_ms !== null && item.end_ms !== null && item.end_ms < item.start_ms)) {
      throw new Error("Feedback evidence contains an invalid time range.");
    }
  }
  const sessionPoints = feedback.categories.reduce((total, category) => total + spokenWeights[category.key] * category.rating / 4, 0);
  const delivery = feedback.categories.find((category) => category.key === "delivery");
  return { ...feedback, sessionPoints, deliveryPoints: delivery ? 10 * delivery.rating / 4 : 0 };
}

export const simulatorPersonasJsonSchema = {
  type: "object",
  properties: {
    schema_version: { type: "string", enum: ["1"] },
    personas: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          persona_key: { type: "string", enum: ["p1", "p2", "p3"] },
          name: { type: "string", minLength: 2, maxLength: 80 },
          title: { type: "string", minLength: 5, maxLength: 120 },
          focus: { type: "string", minLength: 20, maxLength: 240 },
          voice_style: { type: "string", enum: ["warm-rigorous", "direct-analytical", "calm-strategic"] },
        },
        required: ["persona_key", "name", "title", "focus", "voice_style"],
        additionalProperties: false,
      },
    },
  },
  required: ["schema_version", "personas"],
  additionalProperties: false,
} as const;

export function personaInitials(name: string) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "AI";
}
