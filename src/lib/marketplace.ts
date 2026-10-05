import { z } from "zod";
import { founderSectors, founderStages } from "./profile.ts";

const selection = <T extends readonly [string, ...string[]]>(values: T, max: number) => z.preprocess(
  (value) => value === undefined || value === null || value === "" ? [] : Array.isArray(value) ? value : [value],
  z.array(z.enum(values)).max(max),
);
const optionalWholeMoney = z.preprocess(
  (value) => value === undefined || value === null || value === "" ? null : String(value).trim(),
  z.union([z.null(), z.string().regex(/^\d+$/).refine((value) => BigInt(value) <= BigInt("100000000000000"))]),
);
const optionalScore = z.preprocess(
  (value) => value === undefined || value === null || value === "" ? null : value,
  z.union([z.null(), z.coerce.number().int().min(0).max(100)]),
);
const booleanFilter = z.preprocess(
  (value) => value === true || value === "true" || value === "1" ? true : value === false || value === "false" || value === "0" || value === undefined || value === null || value === "" ? false : value,
  z.boolean(),
);

export const discoveryFilterSchema = z.object({
  q: z.string().trim().max(100).default(""),
  sectors: selection(founderSectors, founderSectors.length).default([]),
  stages: selection(founderStages, founderStages.length).default([]),
  countries: z.preprocess(
    (value) => value === undefined || value === null || value === "" ? [] : Array.isArray(value) ? value : [value],
    z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/)).max(10),
  ).default([]),
  ask_currency: z.union([z.literal(""), z.enum(["NGN", "USD"])]).default(""),
  ask_min: optionalWholeMoney.default(null),
  ask_max: optionalWholeMoney.default(null),
  minimum_score: optionalScore.default(null),
  verified_only: booleanFilter.default(false),
  page: z.coerce.number().int().min(1).max(100).default(1),
}).superRefine((filters, context) => {
  if ((filters.ask_min !== null || filters.ask_max !== null) && !filters.ask_currency) {
    context.addIssue({ code: "custom", path: ["ask_currency"], message: "Choose a currency for the funding range." });
  }
  if (filters.ask_min !== null && filters.ask_max !== null && BigInt(filters.ask_min) > BigInt(filters.ask_max)) {
    context.addIssue({ code: "custom", path: ["ask_max"], message: "Maximum funding must be at least the minimum." });
  }
});

export type DiscoveryFilters = z.infer<typeof discoveryFilterSchema>;

export type DiscoveryCard = {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  ask: string;
  score: number;
  verified: boolean;
  isDemo: boolean;
  demoTier?: "free" | "pro";
};

export type DiscoveryResult = {
  items: DiscoveryCard[];
  total: number;
  page: number;
  pageSize: 15;
  pageCount: number;
};

export function hasProDiscoveryFilters(filters: DiscoveryFilters) {
  return filters.countries.length > 0
    || filters.ask_min !== null
    || filters.ask_max !== null
    || filters.minimum_score !== null
    || filters.verified_only;
}

export type DiscoveryFilterCandidate = {
  searchableText: string;
  sector: (typeof founderSectors)[number];
  stage: (typeof founderStages)[number];
  country: string;
  askCurrency: "NGN" | "USD";
  askMinor: string;
  score: number;
  verified: boolean;
};

export function matchesDiscoveryFilters(candidate: DiscoveryFilterCandidate, filters: DiscoveryFilters) {
  const query = filters.q.toLocaleLowerCase();
  const minimumAsk = filters.ask_min === null ? null : BigInt(filters.ask_min) * BigInt(100);
  const maximumAsk = filters.ask_max === null ? null : BigInt(filters.ask_max) * BigInt(100);
  const askMinor = BigInt(candidate.askMinor);
  return (!query || candidate.searchableText.toLocaleLowerCase().includes(query))
    && (filters.sectors.length === 0 || filters.sectors.includes(candidate.sector))
    && (filters.stages.length === 0 || filters.stages.includes(candidate.stage))
    && (filters.countries.length === 0 || filters.countries.includes(candidate.country))
    && (!filters.ask_currency || candidate.askCurrency === filters.ask_currency)
    && (minimumAsk === null || askMinor >= minimumAsk)
    && (maximumAsk === null || askMinor <= maximumAsk)
    && (filters.minimum_score === null || candidate.score >= filters.minimum_score)
    && (!filters.verified_only || candidate.verified);
}
