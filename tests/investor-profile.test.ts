import assert from "node:assert/strict";
import test from "node:test";
import { investorProfileSchema } from "../src/lib/investor-profile.ts";
import { discoveryFilterSchema, hasProDiscoveryFilters, matchesDiscoveryFilters } from "../src/lib/marketplace.ts";

const valid = {
  full_name: "Ada Investor",
  investor_type: "angel",
  firm_name: "North Star Angels",
  professional_title: "Angel investor",
  bio: "I invest in early-stage teams building useful infrastructure.",
  sectors: ["fintech", "healthtech"],
  stages: ["pre-seed", "seed"],
  countries: [],
  check_currency: "USD",
  check_min_minor: "1000000",
  check_max_minor: "10000000",
  linkedin_url: "https://www.linkedin.com/in/ada-investor",
};

test("accepts a complete investor profile with an explicit Anywhere preference", () => {
  const result = investorProfileSchema.safeParse(valid);
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.countries, []);
});

test("rejects an inverted cheque range and non-LinkedIn professional URL", () => {
  const result = investorProfileSchema.safeParse({ ...valid, check_min_minor: "20000000", check_max_minor: "10000000", linkedin_url: "https://example.com/ada" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert(result.error.issues.some((issue) => issue.path[0] === "check_max_minor"));
    assert(result.error.issues.some((issue) => issue.path[0] === "linkedin_url"));
  }
});

test("returns a field error for a nonnumeric cheque amount", () => {
  const result = investorProfileSchema.safeParse({ ...valid, check_min_minor: "None yet" });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path[0] === "check_min_minor"));
});

test("rejects investor profiles without a sector or stage", () => {
  assert.equal(investorProfileSchema.safeParse({ ...valid, sectors: [] }).success, false);
  assert.equal(investorProfileSchema.safeParse({ ...valid, stages: [] }).success, false);
});

test("normalizes and bounds discovery filters", () => {
  assert.deepEqual(discoveryFilterSchema.parse({ q: "  care  ", sectors: ["healthtech", "fintech"], stages: "seed", page: "2" }), {
    q: "care", sectors: ["healthtech", "fintech"], stages: ["seed"], countries: [], ask_currency: "", ask_min: null,
    ask_max: null, minimum_score: null, verified_only: false, page: 2,
  });
  assert.equal(discoveryFilterSchema.safeParse({ page: 101 }).success, false);
  assert.equal(discoveryFilterSchema.safeParse({ sectors: "made-up" }).success, false);
});

test("requires like-for-like funding bounds and validates Pro filter limits", () => {
  assert.equal(discoveryFilterSchema.safeParse({ ask_min: "100000" }).success, false);
  assert.equal(discoveryFilterSchema.safeParse({ ask_currency: "USD", ask_min: "200000", ask_max: "100000" }).success, false);
  const result = discoveryFilterSchema.parse({ countries: ["ng", "GB"], ask_currency: "USD", ask_min: "100000", minimum_score: "70", verified_only: "true" });
  assert.deepEqual(result.countries, ["NG", "GB"]);
  assert.equal(result.minimum_score, 70);
  assert.equal(result.verified_only, true);
  assert.equal(hasProDiscoveryFilters(result), true);
});

test("applies OR within dimensions and AND across precision filters", () => {
  const filters = discoveryFilterSchema.parse({
    q: "ledger", sectors: ["fintech", "healthtech"], stages: ["pre-seed", "seed"], countries: ["NG", "GB"],
    ask_currency: "USD", ask_min: "200000", ask_max: "300000", minimum_score: "70",
  });
  const candidate = { searchableText: "Signal Ledger for retail teams", sector: "fintech" as const, stage: "pre-seed" as const, country: "NG", askCurrency: "USD" as const, askMinor: "25000000", score: 70, verified: false };
  assert.equal(matchesDiscoveryFilters(candidate, filters), true);
  assert.equal(matchesDiscoveryFilters({ ...candidate, askCurrency: "NGN" }, filters), false);
  assert.equal(matchesDiscoveryFilters({ ...candidate, country: "US" }, filters), false);
  assert.equal(matchesDiscoveryFilters({ ...candidate, score: 69 }, filters), false);
});
