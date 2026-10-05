import assert from "node:assert/strict";
import test from "node:test";
import { startups } from "../src/data/startups.ts";
import { investorCountries } from "../src/lib/investor-profile.ts";
import { discoveryFilterSchema, matchesDiscoveryFilters } from "../src/lib/marketplace.ts";

const africanCountries = new Set(["NG", "GH", "KE", "RW", "ZA", "UG", "EG", "TZ"]);
const europeanCountries = new Set(["GB", "FR", "DE", "NL", "SE"]);

test("demo catalogue has 15 distinct, filterable African and European profiles", () => {
  assert.equal(startups.length, 15);
  assert.equal(new Set(startups.map((startup) => startup.slug)).size, 15);
  assert.equal(startups.filter((startup) => africanCountries.has(startup.country)).length, 10);
  assert.equal(startups.filter((startup) => europeanCountries.has(startup.country)).length, 5);
  assert.ok(startups.some((startup) => startup.tier === "pro"));
  assert.ok(startups.some((startup) => startup.tier === "free"));
  const countryOptions = new Set<string>(investorCountries.map(([code]) => code));
  for (const startup of startups) {
    assert.ok(countryOptions.has(startup.country), `${startup.name} country is selectable`);
    assert.ok(startup.problem.length > 60 && startup.solution.length > 60, `${startup.name} has a substantive case`);
    assert.equal(startup.askMinor.match(/^\d+$/)?.[0], startup.askMinor);
    assert.ok(startup.score >= 50 && startup.score <= 100);
    assert.ok(startup.score - startup.deliveryPoints <= 90);
    assert.equal(startup.tier === "free", startup.deliveryPoints === 0);
    if (startup.verified) assert.ok(startup.tier === "pro" && startup.deliveryPoints >= 7 && startup.score >= 70);
  }
});

test("demo profiles cover useful investor filter combinations", () => {
  const filters = discoveryFilterSchema.parse({
    sectors: ["climate-energy"], countries: ["ZA", "GB"],
    ask_currency: "USD", ask_max: "900000", minimum_score: 75, verified_only: true,
  });
  const matching = startups.filter((startup) => matchesDiscoveryFilters({
    searchableText: `${startup.name} ${startup.tagline} ${startup.problem} ${startup.solution}`,
    sector: startup.sectorKey, stage: startup.stageKey, country: startup.country,
    askCurrency: startup.askCurrency, askMinor: startup.askMinor,
    score: startup.score, verified: startup.verified,
  }, filters));
  assert.deepEqual(matching.map((startup) => startup.slug), ["coolchain-commons", "civicmeter"]);
});
