import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultFounderDraft,
  draftFromFormData,
  founderDraftSchema,
  majorToMinor,
  minorToMajor,
  reviewableFounderDraftSchema,
} from "../src/lib/profile.ts";
import { profileReviewFailureCode, validateAndScoreProfileReview } from "../src/lib/profile-review.ts";
import { createProfileReviewRequest } from "../src/lib/profile-review-request.ts";
import { founderContentHash } from "../src/lib/profile-content.ts";

test("provider schema permits zero-rated traction without evidence despite numeric placeholders", () => {
  const profile = { ...completeProfile, traction: { ...completeProfile.traction, interview_count: 0, pilot_count: 0, active_user_count: 0 } };
  const request = createProfileReviewRequest(profile);
  assert.equal(request.input.evidence_choices.traction.length, 3);
  const response = {
    schema_version: "1",
    categories: Object.fromEntries(Object.entries(request.input.evidence_choices).map(([key, choices]) => [key, {
      rating: key === "traction" || !choices.length ? 0 : 2,
      rationale: "The submitted material leaves important assumptions untested and contains no measured validation for this category.",
      evidence_id: key === "traction" ? null : choices[0]?.id ?? null,
      next_step: "Add dated results from the next customer validation pilot.",
    }])),
    flags: [],
  };
  // The rejected live response passed runtime validation but its null ID was
  // forbidden by the schema sent to Groq. Both contracts must agree.
  const schema = request.schema as { properties: { categories: { properties: Record<string, { properties: { evidence_id: unknown } }> } } };
  assert.deepEqual(schema.properties.categories.properties.traction.properties.evidence_id, {
    type: ["string", "null"], enum: [...request.input.evidence_choices.traction.map(choice => choice.id), null],
  });
  assert.equal(request.validate(response).categories.find(category => category.key === "traction")?.rating, 0);
  response.categories.traction.rating = 1;
  assert.throws(() => request.validate(response), /no supporting evidence/);
  response.categories.traction.evidence_id = "unknown_id" as never;
  assert.throws(() => request.validate(response), /unknown evidence ID/);
});

test("classifies Groq schema rejection separately from provider unavailability", () => {
  const error = Object.assign(new Error("Provider rejected output"), { status: 400, error: { error: { code: "json_validate_failed" } } });
  assert.equal(profileReviewFailureCode(error), "provider_schema_rejected");
});

const completeProfile = {
  ...defaultFounderDraft,
  name: "Clear Market",
  tagline: "A clearer route from local supply to retail demand.",
  sector: "commerce" as const,
  stage: "idea" as const,
  country: "NG",
  problem: "Independent retailers cannot reliably compare local supply, delivery timing, and wholesale prices before they commit working capital.",
  solution: "Clear Market gives retailers one purchasing workflow with comparable supplier terms, confirmed delivery windows, and order history.",
  team: [{ name: "Ada Founder", role: "Founder", relevant_experience: "Built retail inventory and payments products for six years." }],
  ask_amount_minor: "25000000",
  ask_currency: "USD" as const,
  use_of_funds: "Fund supplier onboarding, retailer pilots, and measurement of repeat purchasing over twelve months.",
  business_model: "Retailers pay a monthly workflow subscription and suppliers pay no listing fee.",
  competition: "Retailers currently compare WhatsApp messages, market visits, and individual distributor lists.",
};

test("an unchanged saved draft retains its review identity; edited content does not", () => {
  const original = founderDraftSchema.parse(completeProfile);
  const savedAgain = founderDraftSchema.parse(JSON.parse(JSON.stringify(original)));
  assert.equal(founderContentHash(savedAgain), founderContentHash(original));
  const edited = founderDraftSchema.parse({ ...original, tagline: "A new purchasing workflow for retailers." });
  assert.notEqual(founderContentHash(edited), founderContentHash(original));
});

function validReview() {
  const categories = [
    ["clarity", "Independent retailers"],
    ["market", "A clearer route"],
    ["traction", "retailer pilots"],
    ["team", "Built retail inventory"],
    ["business_model", "Retailers pay a monthly"],
    ["competition", "WhatsApp messages"],
  ] as const;
  const sourceFields = ["problem", "tagline", "use_of_funds", "team.0.relevant_experience", "business_model", "competition"] as const;
  return {
    schema_version: "1",
    categories: categories.map(([key, quote], index) => ({
      key,
      rating: 4,
      rationale: "The submitted material is specific, internally consistent, and tied to direct founder evidence.",
      evidence: [{ source_field: sourceFields[index], quote }],
      next_step: "Add a dated measurement or explicit operating assumption in the next revision.",
    })),
    flags: [],
  };
}

test("accepts the five-field minimum as a private draft", () => {
  const result = founderDraftSchema.safeParse({
    ...defaultFounderDraft,
    name: "Clear Market",
    tagline: "A clearer route from local supply to retail demand.",
    sector: "commerce",
    stage: "idea",
    country: "NG",
  });
  assert.equal(result.success, true);
});

test("requires the publication fields before provider review", () => {
  const result = reviewableFounderDraftSchema.safeParse({
    ...defaultFounderDraft,
    name: "Clear Market",
    tagline: "A clearer route from local supply to retail demand.",
    sector: "commerce",
    stage: "idea",
    country: "NG",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join("."));
    assert.ok(paths.includes("problem"));
    assert.ok(paths.includes("solution"));
    assert.ok(paths.includes("team.0.name"));
    assert.ok(paths.includes("ask_amount_minor"));
    assert.ok(paths.includes("use_of_funds"));
  }
});

test("enforces market hierarchy without inventing currency conversion", () => {
  const result = founderDraftSchema.safeParse({
    ...defaultFounderDraft,
    name: "Clear Market",
    tagline: "A clearer route from local supply to retail demand.",
    sector: "commerce",
    stage: "idea",
    country: "NG",
    market: {
      ...defaultFounderDraft.market,
      currency: "USD",
      tam_minor: "10000",
      sam_minor: "20000",
    },
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path.join(".") === "market.tam_minor"));
});

test("returns field errors for text entered in money fields instead of throwing", () => {
  const result = reviewableFounderDraftSchema.safeParse({
    ...completeProfile,
    ask_amount_minor: "None yet",
    market: { ...completeProfile.market, tam_minor: "None yet" },
    traction: { ...completeProfile.traction, monthly_revenue_minor: "None yet" },
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join("."));
    assert.ok(paths.includes("ask_amount_minor"));
    assert.ok(paths.includes("market.tam_minor"));
    assert.ok(paths.includes("traction.monthly_revenue_minor"));
  }
});

test("converts display money to integer minor-unit transport", () => {
  assert.equal(majorToMinor("250,000"), "25000000");
  assert.equal(majorToMinor("19.95"), "1995");
  assert.equal(minorToMajor("25000000"), "250000");
  assert.equal(minorToMajor("1995"), "19.95");

  const formData = new FormData();
  formData.set("name", "Clear Market");
  formData.set("tagline", "A clearer route from local supply to retail demand.");
  formData.set("sector", "commerce");
  formData.set("stage", "idea");
  formData.set("country", "NG");
  formData.set("ask_amount", "250000");
  formData.set("ask_currency", "USD");
  const draft = draftFromFormData(formData) as { ask_amount_minor: string };
  assert.equal(draft.ask_amount_minor, "25000000");
});

test("calculates the canonical 90-point content maximum on the server", () => {
  const result = validateAndScoreProfileReview(validReview(), completeProfile);
  assert.equal(result.contentPoints, 90);
});

test("rejects model evidence that is not in the submitted field", () => {
  const review = validReview();
  review.categories[0].evidence[0].quote = "invented customer claim" as typeof review.categories[0]["evidence"][0]["quote"];
  assert.throws(() => validateAndScoreProfileReview(review, completeProfile), (error) => {
    assert.equal(profileReviewFailureCode(error), "evidence_mismatch");
    return true;
  });
});

test("rejects duplicate category keys even when the schema shape is valid", () => {
  const review = validReview();
  review.categories[5].key = "clarity";
  assert.throws(() => validateAndScoreProfileReview(review, completeProfile), /exactly one rating/);
});

test("normalizes provider array paths before grounding team evidence", () => {
  const review = validReview();
  review.categories[3].evidence[0].source_field = "team[0].relevant_experience" as never;
  const result = validateAndScoreProfileReview(review, completeProfile);
  assert.equal(result.categories[3].evidence[0].source_field, "team.0.relevant_experience");
});

test("accepts a provider flag that names a profile section", () => {
  const review = validReview();
  review.flags.push({ field: "team", code: "missing_evidence", message: "Only one founder is described in the submitted team section." } as never);
  const result = validateAndScoreProfileReview(review, completeProfile);
  assert.equal(result.flags[0].field, "team");
});

test("accepts a provider flag for an empty known field", () => {
  const review = validReview();
  review.flags.push({ field: "market.sources", code: "missing_evidence", message: "No source citations were submitted for the market figures." } as never);
  const result = validateAndScoreProfileReview(review, completeProfile);
  assert.equal(result.flags[0].field, "market.sources");
});

test("grounds selected evidence IDs in exact draft excerpts and saves a complete score", () => {
  const profile = {
    ...completeProfile,
    market: { ...completeProfile.market, explanation: "Retailers’ purchasing budgets define the reachable market.\nOur pilot targets a limited local segment." },
    traction: { ...completeProfile.traction, evidence_note: "Six retailers said: ‘Delivery timing matters.’ We have not yet measured repeat purchasing." },
  };
  const request = createProfileReviewRequest(profile);
  const response = {
    schema_version: "1",
    categories: Object.fromEntries(Object.entries(request.input.evidence_choices).map(([key, choices]) => [key, {
      rating: 4,
      rationale: "The submitted evidence is specific and acknowledges the limits of the current operating assumptions.",
      evidence_id: choices[0].id,
      next_step: "Add a dated measurement from the next operating pilot.",
    }])),
    flags: [],
  };
  const result = request.validate(response);
  assert.equal(result.contentPoints, 90);
  assert.equal(result.categories.length, 6);
  for (const category of result.categories) {
    const choice = request.input.evidence_choices[category.key][0];
    assert.deepEqual(category.evidence, [{ source_field: choice.source_field, quote: choice.quote }]);
  }
  response.categories.clarity.evidence_id = request.input.evidence_choices.team[0].id;
  assert.throws(() => request.validate(response), /unknown evidence ID/);
});

test("keeps long evidence excerpts verbatim and forces blank categories to remain unscored", () => {
  const request = createProfileReviewRequest({ ...completeProfile, problem: "A long sentence with punctuation; and whitespace. ".repeat(35) });
  for (const choice of request.input.evidence_choices.clarity.filter((item) => item.source_field === "problem")) {
    assert.ok(("A long sentence with punctuation; and whitespace. ".repeat(35)).includes(choice.quote));
    assert.ok(choice.quote.length <= 180);
  }
  const response = {
    schema_version: "1",
    categories: Object.fromEntries(Object.entries(request.input.evidence_choices).map(([key, choices]) => [key, {
      rating: choices.length ? 2 : 0,
      rationale: "The available material provides some relevant detail but leaves important operating assumptions untested.",
      evidence_id: choices[0]?.id ?? null,
      next_step: "Add a dated measurement from the next operating pilot.",
    }])),
    flags: [],
  };
  const result = request.validate(response);
  assert.equal(result.categories.find((category) => category.key === "market")?.rating, 0);
  response.categories.market.rating = 3;
  assert.throws(() => request.validate(response), /no supporting evidence/);
});
