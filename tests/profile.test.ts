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
