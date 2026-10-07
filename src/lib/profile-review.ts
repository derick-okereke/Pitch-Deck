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

export function profileReviewFailureCode(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  if (error.name === "ZodError") return "schema_validation_failed";
  if (error instanceof SyntaxError) return "invalid_json";
  if (error.message === "The review did not contain exactly one rating for each category.") return "duplicate_categories";
  if (/^The (clarity|market|traction|team|business_model|competition) rating has no supporting evidence\.$/.test(error.message)) return "missing_evidence";
  if (error.message === "The review cited evidence that is not present in the submitted profile.") return "evidence_mismatch";
  if (error.message === "The review selected an unknown evidence ID.") return "unknown_evidence_id";
  if (error.message === "The review flagged an unknown profile field.") return "unknown_flag_field";
  if (error.message === "Groq returned an empty profile review response.") return "empty_response";
  if (error.message === "Groq is not configured.") return "provider_not_configured";
  if (error.message === "fetch failed") return "transport_failure";
  return "unknown";
}

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
  const knownFields = new Set<string>();
  const visit = (value: unknown, path: string) => {
    if (path) knownFields.add(path);
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
  return { fields, knownFields };
}

function canonicalFieldPath(path: string) {
  return path.replace(/\[(\d+)\]/gu, ".$1");
}

export function validateAndScoreProfileReview(raw: unknown, profile: FounderDraft) {
  const output = profileReviewOutputSchema.parse(raw);
  const keys = output.categories.map((category) => category.key);
  if (new Set(keys).size !== profileCategoryKeys.length || profileCategoryKeys.some((key) => !keys.includes(key))) {
    throw new Error("The review did not contain exactly one rating for each category.");
  }

  const { fields, knownFields } = evidenceFields(profile);
  const categories = output.categories.map((category) => ({
    ...category,
    evidence: category.evidence.map((item) => ({ ...item, source_field: canonicalFieldPath(item.source_field) })),
  }));
  const flags = output.flags.map((flag) => ({ ...flag, field: canonicalFieldPath(flag.field) }));
  for (const category of categories) {
    if (category.rating > 0 && category.evidence.length === 0) {
      throw new Error(`The ${category.key} rating has no supporting evidence.`);
    }
    for (const evidence of category.evidence) {
      const source = fields.get(evidence.source_field);
      if (!source || !source.includes(evidence.quote)) throw new Error("The review cited evidence that is not present in the submitted profile.");
    }
  }
  for (const flag of flags) {
    if (!knownFields.has(flag.field)) throw new Error("The review flagged an unknown profile field.");
  }

  const contentPoints = categories.reduce(
    (total, category) => total + profileCategoryWeights[category.key] * category.rating / 4,
    0,
  );
  return { ...output, categories, flags, contentPoints };
}
