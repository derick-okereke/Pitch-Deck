import { z } from "zod";
import { founderSectors, founderStages } from "./profile.ts";

export const discoveryFilterSchema = z.object({
  q: z.string().trim().max(100).default(""),
  sector: z.union([z.literal(""), z.enum(founderSectors)]).default(""),
  stage: z.union([z.literal(""), z.enum(founderStages)]).default(""),
  page: z.coerce.number().int().min(1).max(100).default(1),
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
};

export type DiscoveryResult = {
  items: DiscoveryCard[];
  total: number;
  page: number;
  pageSize: 12;
  pageCount: number;
};
