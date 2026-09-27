export const founderProfile = {
  name: "Korah Health",
  tagline: "Neighbourhood primary care that working families can plan and afford.",
  sector: "Healthtech",
  stage: "Pre-seed",
  country: "Nigeria",
  city: "Lagos",
  problem: "Working families delay primary care because clinic visits are hard to plan, prices are unclear, and basic diagnostics often require several separate trips.",
  solution: "Korah coordinates neighbourhood diagnostic partners, clinician consultations, and flexible monthly care plans in one mobile-first journey.",
  market: "We estimate a $420m serviceable market across employed households in Lagos and Abuja, beginning with 180,000 households reached through participating employers.",
  traction: "Six clinic partners have signed pilot letters. Thirty-eight families completed discovery interviews and 71% said they had postponed care because of cost uncertainty.",
  team: "Amara Okoye — founder and product lead. Eight years building healthcare operations tools, including patient scheduling and claims workflows for Nigerian clinics.",
  businessModel: "Employers pay a monthly platform fee per enrolled household. Clinics pay no listing fee; Korah earns a service margin on coordinated diagnostics.",
  competition: "Families currently use standalone HMOs, walk-in clinics, or WhatsApp referrals. Korah combines price clarity, booking, and follow-up across neighbourhood providers.",
  ask: "$250,000",
  useOfFunds: "Fund 18 months of product delivery, clinical-partner onboarding, and a measured Lagos pilot.",
};

export const reviewCategories = [
  { label: "Clarity", score: 16, max: 20, state: "Strong", note: "The problem and care journey are concrete and easy to repeat." },
  { label: "Market", score: 9, max: 15, state: "Improve", note: "Explain the assumptions behind the 180,000 reachable households." },
  { label: "Traction", score: 12, max: 20, state: "Developing", note: "Pilot letters are relevant; add dates and what each partner committed to." },
  { label: "Team", score: 12, max: 15, state: "Strong", note: "Experience is connected directly to the operating problem." },
  { label: "Business model", score: 8, max: 10, state: "Strong", note: "The payer and value exchange are clear." },
  { label: "Competition", score: 7.5, max: 10, state: "Developing", note: "Name two direct alternatives and explain why partners would switch." },
];

export const contentScore = reviewCategories.reduce((total, category) => total + category.score, 0);

