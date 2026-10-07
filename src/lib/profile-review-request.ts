import { z } from "zod";
import type { FounderDraft } from "./profile.ts";
import { profileCategoryKeys, type ProfileCategoryKey, validateAndScoreProfileReview } from "./profile-review.ts";

type EvidenceChoice = { id: string; source_field: string; quote: string };

const responseCategory = z.object({
  rating: z.number().int().min(0).max(4),
  rationale: z.string().min(40).max(600),
  evidence_id: z.string().nullable(),
  next_step: z.string().min(20).max(400),
}).strict();

const responseSchema = z.object({
  schema_version: z.literal("1"),
  categories: z.record(z.enum(profileCategoryKeys), responseCategory),
  flags: z.array(z.object({
    field: z.string(),
    code: z.enum(["missing_evidence", "vague", "inconsistent", "unclear"]),
    message: z.string().min(10).max(300),
  }).strict()).max(12),
}).strict();

function excerpts(value: string) {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + 180, value.length);
    if (end < value.length) {
      const boundary = value.lastIndexOf(" ", end);
      if (boundary > start) end = boundary;
    }
    const quote = value.slice(start, end).trim();
    if (quote) chunks.push(quote);
    start = end;
    while (/\s/u.test(value[start] ?? "") && start < value.length) start += 1;
  }
  return chunks.length <= 6 ? chunks : Array.from({ length: 6 }, (_, index) => chunks[Math.round(index * (chunks.length - 1) / 5)]);
}

function categoryFor(path: string): ProfileCategoryKey | null {
  if (["tagline", "problem", "solution"].includes(path)) return "clarity";
  if (/^market\.(explanation|tam_minor|sam_minor|som_minor|sources\.\d+\.label)$/.test(path)) return "market";
  if (/^traction\.(evidence_note|interview_count|waitlist_count|loi_count|active_user_count|pilot_count|monthly_revenue_minor|mrr_minor|arr_minor|growth_pct|retention_pct)$/.test(path)) return "traction";
  if (/^team\.\d+\.(name|role|relevant_experience)$/.test(path)) return "team";
  if (path === "business_model" || path === "competition") return path;
  return null;
}

export function createProfileReviewRequest(profile: FounderDraft) {
  const choices: Record<ProfileCategoryKey, EvidenceChoice[]> = {
    clarity: [], market: [], traction: [], team: [], business_model: [], competition: [],
  };
  const knownFields: string[] = [];
  function visit(value: unknown, path: string) {
    if (path) knownFields.push(path);
    if (typeof value === "string" || typeof value === "number") {
      const category = categoryFor(path);
      if (category && String(value).trim()) {
        for (const quote of excerpts(String(value))) {
          choices[category].push({ id: `${category}_${choices[category].length}`, source_field: path, quote });
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  }
  visit(profile, "");

  const schema = z.toJSONSchema(responseSchema) as Record<string, unknown>;
  delete schema.$schema;
  const properties = schema.properties as Record<string, unknown>;
  properties.categories = {
    type: "object",
    properties: Object.fromEntries(profileCategoryKeys.map((key) => {
      const category = z.toJSONSchema(responseCategory) as Record<string, unknown>;
      delete category.$schema;
      const categoryProperties = category.properties as Record<string, unknown>;
      categoryProperties.evidence_id = choices[key].length
        ? { type: "string", enum: choices[key].map((choice) => choice.id) }
        : { type: "null" };
      if (!choices[key].length) categoryProperties.rating = { type: "integer", enum: [0] };
      return [key, category];
    })),
    required: [...profileCategoryKeys],
    additionalProperties: false,
  };
  const flags = properties.flags as { items: { properties: Record<string, unknown> } };
  flags.items.properties.field = { type: "string", enum: knownFields };

  return {
    schema,
    input: { profile, evidence_choices: choices },
    validate(raw: unknown) {
      const response = responseSchema.parse(raw);
      const categories = profileCategoryKeys.map((key) => {
        const category = response.categories[key];
        const evidence = choices[key].find((choice) => choice.id === category.evidence_id);
        if (category.evidence_id !== null && !evidence) throw new Error("The review selected an unknown evidence ID.");
        if (category.rating > 0 && !evidence) throw new Error(`The ${key} rating has no supporting evidence.`);
        return {
          key, rating: category.rating, rationale: category.rationale, next_step: category.next_step,
          evidence: evidence ? [{ source_field: evidence.source_field, quote: evidence.quote }] : [],
        };
      });
      return validateAndScoreProfileReview({ schema_version: response.schema_version, categories, flags: response.flags }, profile);
    },
  };
}
