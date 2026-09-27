import { z } from "zod";
import type { FounderDraft } from "@/lib/profile";

export const profileCategoryKeys = ["clarity", "market", "traction", "team", "business_model", "competition"] as const;
export type ProfileCategoryKey = (typeof profileCategoryKeys)[number];

export const profileCategoryWeights: Record<ProfileCategoryKey, number> = {
  clarity: 20,
  market: 15,
  traction: 20,
  team: 15,
  business_model: 10,
  competition: 10,
};

const evidenceSchema = z.object({
  source_field: z.string().min(1).max(120),
  quote: z.string().min(1).max(240),
}).strict();

const categorySchema = z.object({
  key: z.enum(profileCategoryKeys),
  rating: z.number().int().min(0).max(4),
  rationale: z.string().min(40).max(600),
  evidence: z.array(evidenceSchema).max(3),
  next_step: z.string().min(20).max(400),
}).strict();

const flagSchema = z.object({
  field: z.string().min(1).max(120),
  code: z.enum(["missing_evidence", "vague", "inconsistent", "unclear"]),
  message: z.string().min(10).max(300),
}).strict();

export const profileReviewOutputSchema = z.object({
  schema_version: z.literal("1"),
  categories: z.array(categorySchema).length(6),
  flags: z.array(flagSchema).max(12),
}).strict();

export type ProfileReviewOutput = z.infer<typeof profileReviewOutputSchema>;

export const profileReviewJsonSchema = {
  type: "object",
  properties: {
    schema_version: { type: "string", enum: ["1"] },
    categories: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: profileCategoryKeys },
          rating: { type: "integer", minimum: 0, maximum: 4 },
          rationale: { type: "string", minLength: 40, maxLength: 600 },
          evidence: {
            type: "array",
            minItems: 0,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                source_field: { type: "string", minLength: 1, maxLength: 120 },
                quote: { type: "string", minLength: 1, maxLength: 240 },
              },
              required: ["source_field", "quote"],
              additionalProperties: false,
            },
          },
          next_step: { type: "string", minLength: 20, maxLength: 400 },
        },
        required: ["key", "rating", "rationale", "evidence", "next_step"],
        additionalProperties: false,
      },
    },
    flags: {
      type: "array",
      minItems: 0,
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          field: { type: "string", minLength: 1, maxLength: 120 },
          code: { type: "string", enum: ["missing_evidence", "vague", "inconsistent", "unclear"] },
          message: { type: "string", minLength: 10, maxLength: 300 },
        },
        required: ["field", "code", "message"],
        additionalProperties: false,
      },
    },
  },
  required: ["schema_version", "categories", "flags"],
  additionalProperties: false,
} as const;

function evidenceFields(profile: FounderDraft) {
  const fields = new Map<string, string>();
  const visit = (value: unknown, path: string) => {
    if (typeof value === "string" || typeof value === "number") {
      if (String(value).trim()) fields.set(path, String(value).trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, path ? `${path}.${index}` : String(index)));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  };
  visit(profile, "");
  return fields;
}

export function validateAndScoreProfileReview(raw: unknown, profile: FounderDraft) {
  const output = profileReviewOutputSchema.parse(raw);
  const keys = output.categories.map((category) => category.key);
  if (new Set(keys).size !== profileCategoryKeys.length || profileCategoryKeys.some((key) => !keys.includes(key))) {
    throw new Error("The review did not contain exactly one rating for each category.");
  }

  const fields = evidenceFields(profile);
  for (const category of output.categories) {
    if (category.rating > 0 && category.evidence.length === 0) {
      throw new Error(`The ${category.key} rating has no supporting evidence.`);
    }
    for (const evidence of category.evidence) {
      const source = fields.get(evidence.source_field);
      if (!source || !source.includes(evidence.quote)) throw new Error("The review cited evidence that is not present in the submitted profile.");
    }
  }
  for (const flag of output.flags) {
    if (!fields.has(flag.field) && !flag.field.startsWith("team.")) throw new Error("The review flagged an unknown profile field.");
  }

  const contentPoints = output.categories.reduce(
    (total, category) => total + profileCategoryWeights[category.key] * category.rating / 4,
    0,
  );
  return { ...output, contentPoints };
}
