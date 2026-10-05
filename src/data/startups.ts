import type { DiscoveryFilterCandidate } from "@/lib/marketplace";

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
  sectorKey: DiscoveryFilterCandidate["sector"];
  stageKey: DiscoveryFilterCandidate["stage"];
  country: string;
  askCurrency: DiscoveryFilterCandidate["askCurrency"];
  askMinor: string;
  tier: "free" | "pro";
  deliveryPoints: number;
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
    sectorKey: "healthtech", stageKey: "pre-seed", country: "NG", askCurrency: "USD", askMinor: "25000000", tier: "pro", deliveryPoints: 8,
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
    traction: "Illustrative scenario: cooperative leads are testing whether shared orders reduce input costs before a wider rollout.",
    sectorKey: "agritech", stageKey: "seed", country: "NG", askCurrency: "USD", askMinor: "60000000", tier: "pro", deliveryPoints: 7,
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
    traction: "Illustrative scenario: a small group of independent couriers is validating pooled dispatch on repeat routes.",
    sectorKey: "logistics", stageKey: "pre-seed", country: "GH", askCurrency: "USD", askMinor: "18000000", tier: "pro", deliveryPoints: 7,
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
    traction: "Illustrative scenario: pilot retailers are comparing daily cash forecasts with their manual records.",
    sectorKey: "fintech", stageKey: "seed", country: "KE", askCurrency: "USD", askMinor: "90000000", tier: "free", deliveryPoints: 0,
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
    traction: "Illustrative scenario: site operators are measuring repair time before expanding the service network.",
    sectorKey: "climate-energy", stageKey: "growth", country: "RW", askCurrency: "USD", askMinor: "120000000", tier: "pro", deliveryPoints: 8,
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
    problem: "Teachers often receive useful assessment results too late to give individual pupils targeted help before the next topic begins.",
    solution: "Classwell turns weekly exercises into small, actionable intervention groups.",
    traction: "Illustrative scenario: teachers are testing whether weekly intervention groups improve follow-up rates.",
    sectorKey: "education", stageKey: "idea", country: "NG", askCurrency: "NGN", askMinor: "3500000000", tier: "free", deliveryPoints: 0,
  },
  {
    slug: "coolchain-commons", name: "Coolchain Commons",
    tagline: "Shared cold storage for produce traders near regional markets.",
    sector: "Climate & energy", stage: "Seed", location: "Cape Town, ZA", ask: "$750k", score: 79, verified: true,
    problem: "Produce traders lose margin when short gaps in chilled storage force early discounting or spoilage.",
    solution: "Coolchain Commons offers bookable solar-assisted cold rooms and simple temperature records close to market stalls.",
    traction: "Illustrative scenario: market associations are evaluating storage demand and per-crate pricing.",
    sectorKey: "climate-energy", stageKey: "seed", country: "ZA", askCurrency: "USD", askMinor: "75000000", tier: "pro", deliveryPoints: 8,
  },
  {
    slug: "lakeclass", name: "Lakeclass",
    tagline: "Offline-first lessons and progress checks for rural classrooms.",
    sector: "Education", stage: "Idea", location: "Kampala, UG", ask: "$120k", score: 58, verified: false,
    problem: "Teachers with intermittent connectivity cannot rely on web-only learning tools or consistent student records.",
    solution: "Lakeclass syncs short lessons, printable activities, and progress checks when a school has a connection.",
    traction: "Illustrative scenario: educators are reviewing the lesson format before any classroom pilot.",
    sectorKey: "education", stageKey: "idea", country: "UG", askCurrency: "USD", askMinor: "12000000", tier: "free", deliveryPoints: 0,
  },
  {
    slug: "nileledger", name: "Nileledger",
    tagline: "Invoice reconciliation for small exporters and their freight partners.",
    sector: "Fintech", stage: "Seed", location: "Cairo, EG", ask: "$1.1m", score: 86, verified: true,
    problem: "Exporters spend days matching invoices, freight charges, and payment receipts across currencies and providers.",
    solution: "Nileledger links shipment references to invoices and flags mismatches for a human finance reviewer.",
    traction: "Illustrative scenario: finance teams are assessing how much reconciliation time a controlled pilot could save.",
    sectorKey: "fintech", stageKey: "seed", country: "EG", askCurrency: "USD", askMinor: "110000000", tier: "pro", deliveryPoints: 9,
  },
  {
    slug: "bandari-route", name: "Bandari Route",
    tagline: "Shipment visibility for small manufacturers using regional road freight.",
    sector: "Logistics", stage: "Growth", location: "Dar es Salaam, TZ", ask: "$2m", score: 72, verified: false,
    problem: "Manufacturers cannot easily tell whether a delayed delivery sits at pickup, border, or last-mile handoff.",
    solution: "Bandari Route gives shippers one timeline assembled from driver updates and carrier milestones.",
    traction: "Illustrative scenario: freight partners are comparing the shared timeline with current phone-based updates.",
    sectorKey: "logistics", stageKey: "growth", country: "TZ", askCurrency: "USD", askMinor: "200000000", tier: "free", deliveryPoints: 0,
  },
  {
    slug: "civicmeter", name: "Civicmeter",
    tagline: "Building-energy reporting for local authorities and housing providers.",
    sector: "Climate & energy", stage: "Seed", location: "London, GB", ask: "$850k", score: 83, verified: true,
    problem: "Housing teams struggle to compare energy use across older buildings with inconsistent meter records.",
    solution: "Civicmeter normalizes meter feeds and highlights where a retrofit or maintenance visit may have the greatest effect.",
    traction: "Illustrative scenario: housing analysts are validating baseline reporting with sample building records.",
    sectorKey: "climate-energy", stageKey: "seed", country: "GB", askCurrency: "USD", askMinor: "85000000", tier: "pro", deliveryPoints: 8,
  },
  {
    slug: "atelier-care", name: "Atelier Care",
    tagline: "Care coordination for patients managing multiple specialist appointments.",
    sector: "Healthtech", stage: "Pre-seed", location: "Paris, FR", ask: "$400k", score: 65, verified: false,
    problem: "Patients with several specialists often repeat histories and miss follow-up tasks between visits.",
    solution: "Atelier Care provides a patient-controlled timeline, appointment checklist, and exportable summary for clinicians.",
    traction: "Illustrative scenario: patient advocates are reviewing consent and handoff flows before a clinical pilot.",
    sectorKey: "healthtech", stageKey: "pre-seed", country: "FR", askCurrency: "USD", askMinor: "40000000", tier: "free", deliveryPoints: 0,
  },
  {
    slug: "werkflow", name: "Werkflow",
    tagline: "Maintenance scheduling for small industrial equipment fleets.",
    sector: "Enterprise software", stage: "Growth", location: "Berlin, DE", ask: "$1.8m", score: 91, verified: true,
    problem: "Factory teams lose machine availability when service records and spare-part orders are disconnected.",
    solution: "Werkflow combines usage-based maintenance prompts, technician schedules, and parts availability in one operations view.",
    traction: "Illustrative scenario: operations managers are comparing planned downtime against current reactive maintenance.",
    sectorKey: "enterprise-software", stageKey: "growth", country: "DE", askCurrency: "USD", askMinor: "180000000", tier: "pro", deliveryPoints: 9,
  },
  {
    slug: "canalcart", name: "Canalcart",
    tagline: "Reusable packaging returns for independent online merchants.",
    sector: "Commerce", stage: "Seed", location: "Amsterdam, NL", ask: "$700k", score: 76, verified: false,
    problem: "Small merchants cannot coordinate packaging returns efficiently enough to make reusable shipping practical.",
    solution: "Canalcart aggregates return points and gives merchants a simple deposit and tracking workflow.",
    traction: "Illustrative scenario: merchants are testing whether return-point density supports a viable reuse loop.",
    sectorKey: "commerce", stageKey: "seed", country: "NL", askCurrency: "USD", askMinor: "70000000", tier: "free", deliveryPoints: 0,
  },
  {
    slug: "northstar-learn", name: "Northstar Learn",
    tagline: "Skills practice for adults changing careers into technical roles.",
    sector: "Education", stage: "Pre-seed", location: "Stockholm, SE", ask: "$300k", score: 73, verified: true,
    problem: "Career changers need specific practice feedback but cannot always commit to full-time training.",
    solution: "Northstar Learn pairs short workplace simulations with mentor review and a clear skills portfolio.",
    traction: "Illustrative scenario: mentors are assessing whether the simulation feedback is useful to learners and employers.",
    sectorKey: "education", stageKey: "pre-seed", country: "SE", askCurrency: "USD", askMinor: "30000000", tier: "pro", deliveryPoints: 7,
  },
];
