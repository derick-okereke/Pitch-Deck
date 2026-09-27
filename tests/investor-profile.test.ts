import assert from "node:assert/strict";
import test from "node:test";
import { investorProfileSchema } from "../src/lib/investor-profile.ts";
import { discoveryFilterSchema } from "../src/lib/marketplace.ts";

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

test("rejects investor profiles without a sector or stage", () => {
  assert.equal(investorProfileSchema.safeParse({ ...valid, sectors: [] }).success, false);
  assert.equal(investorProfileSchema.safeParse({ ...valid, stages: [] }).success, false);
});

test("normalizes and bounds basic discovery filters", () => {
  assert.deepEqual(discoveryFilterSchema.parse({ q: "  care  ", sector: "healthtech", stage: "seed", page: "2" }), { q: "care", sector: "healthtech", stage: "seed", page: 2 });
  assert.equal(discoveryFilterSchema.safeParse({ page: 101 }).success, false);
  assert.equal(discoveryFilterSchema.safeParse({ sector: "made-up" }).success, false);
});
