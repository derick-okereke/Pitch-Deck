export type Startup = {
  slug: string;
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  ask: string;
  score: number;
  verified: boolean;
  problem: string;
  solution: string;
  traction: string;
};

export const startups: Startup[] = [
  {
    slug: "korah-health",
    name: "Korah Health",
    tagline: "Affordable primary care for urban families through neighbourhood diagnostics and flexible health plans.",
    sector: "Healthtech",
    stage: "Pre-seed",
    location: "Lagos, NG",
    ask: "$250k",
    score: 78,
    verified: true,
    problem: "Working families often delay primary care because clinic visits are hard to plan, prices are unclear, and basic diagnostics require several separate trips.",
    solution: "Korah coordinates neighbourhood diagnostic partners, clinician consultations, and flexible monthly plans in one mobile-first care journey.",
    traction: "Demo fixture: 6 clinic partners prepared for a controlled pilot; no live commercial results are claimed.",
  },
  {
    slug: "fieldnote",
    name: "Fieldnote",
    tagline: "Crop planning and cooperative purchasing tools for smallholder farming networks.",
    sector: "Agritech",
    stage: "Seed",
    location: "Ibadan, NG",
    ask: "$600k",
    score: 74,
    verified: true,
    problem: "Small farms make planting and procurement decisions with fragmented local information.",
    solution: "Fieldnote gives cooperative leads a shared planning ledger and demand forecast.",
    traction: "Illustrative demo data only.",
  },
  {
    slug: "routeform",
    name: "Routeform",
    tagline: "Shared dispatch infrastructure for independent last-mile operators.",
    sector: "Logistics",
    stage: "Pre-seed",
    location: "Accra, GH",
    ask: "$180k",
    score: 71,
    verified: true,
    problem: "Independent operators lose capacity because dispatch demand is fragmented.",
    solution: "Routeform pools jobs and exposes a simple dispatch layer across fleets.",
    traction: "Illustrative demo data only.",
  },
  {
    slug: "ledgerlane",
    name: "Ledgerlane",
    tagline: "Plain-language cashflow controls for growing African retail businesses.",
    sector: "Fintech",
    stage: "Seed",
    location: "Nairobi, KE",
    ask: "$900k",
    score: 68,
    verified: false,
    problem: "Retail operators struggle to see cash commitments across fragmented tools.",
    solution: "Ledgerlane creates a daily operating view from sales, stock, and payment data.",
    traction: "Illustrative demo data only.",
  },
  {
    slug: "gridkind",
    name: "Gridkind",
    tagline: "Usage-based solar maintenance for community commercial sites.",
    sector: "Climate & energy",
    stage: "Growth",
    location: "Kigali, RW",
    ask: "$1.2m",
    score: 82,
    verified: true,
    problem: "Distributed systems lose uptime because maintenance is reactive.",
    solution: "Gridkind pairs remote diagnostics with a local service network.",
    traction: "Illustrative demo data only.",
  },
  {
    slug: "classwell",
    name: "Classwell",
    tagline: "Assessment workflows that help secondary-school teachers intervene earlier.",
    sector: "Education",
    stage: "Idea",
    location: "Abuja, NG",
    ask: "₦35m",
    score: 63,
    verified: false,
    problem: "Teachers often receive useful assessment signals too late.",
    solution: "Classwell turns weekly exercises into small, actionable intervention groups.",
    traction: "Illustrative demo data only.",
  },
];

