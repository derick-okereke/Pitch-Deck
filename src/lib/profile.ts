import { z } from "zod";

export const founderStages = ["idea", "pre-seed", "seed", "growth"] as const;
export const founderSectors = [
  "agritech",
  "climate-energy",
  "commerce",
  "education",
  "fintech",
  "healthtech",
  "logistics",
  "enterprise-software",
  "consumer",
  "other",
] as const;

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function normalize(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function text(min: number, max: number, label: string, singleLine = false) {
  return z.string().transform(normalize).superRefine((value, context) => {
    const length = Array.from(value).length;
    if (length < min) context.addIssue({ code: "custom", message: `${label} must be at least ${min} characters.` });
    if (length > max) context.addIssue({ code: "custom", message: `${label} must be no more than ${max} characters.` });
    if (controlCharacters.test(value)) context.addIssue({ code: "custom", message: `${label} contains unsupported characters.` });
    if (singleLine && value.includes("\n")) context.addIssue({ code: "custom", message: `${label} must be a single line.` });
  });
}

const optionalText = (max: number, label: string) => text(0, max, label);
const optionalCount = z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000_000)]);
const minorUnits = (value: string) => /^\d+$/.test(value) ? BigInt(value) : null;
const optionalMoney = z.union([
  z.literal(""),
  z.string()
    .regex(/^\d+$/, "Enter a valid amount with no more than two decimal places.")
    .refine((value) => {
      const amount = minorUnits(value);
      return amount === null || amount <= BigInt("100000000000000");
    }, "The amount is above the supported maximum."),
]);

export const teamMemberSchema = z.object({
  name: text(0, 80, "Team member name", true),
  role: text(0, 80, "Team member role", true),
  relevant_experience: text(0, 400, "Relevant experience"),
}).strict();

export const marketSchema = z.object({
  currency: z.enum(["NGN", "USD"]).nullable(),
  tam_minor: optionalMoney,
  sam_minor: optionalMoney,
  som_minor: optionalMoney,
  explanation: optionalText(1_500, "Market explanation"),
  sources: z.array(z.object({
    label: text(1, 120, "Source label", true),
    url: z.string().trim().url("Enter a valid source URL.").max(2_048).refine((url) => url.startsWith("https://"), "Source URLs must use HTTPS."),
  }).strict()).max(3),
}).strict();

export const tractionSchema = z.object({
  evidence_note: optionalText(1_500, "Traction evidence"),
  interview_count: optionalCount,
  waitlist_count: optionalCount,
  loi_count: optionalCount,
  active_user_count: optionalCount,
  pilot_count: optionalCount,
  monthly_revenue_minor: optionalMoney,
  mrr_minor: optionalMoney,
  arr_minor: optionalMoney,
  revenue_currency: z.enum(["NGN", "USD"]).nullable(),
  growth_pct: z.union([z.literal(""), z.coerce.number().min(-100).max(10_000)]),
  retention_pct: z.union([z.literal(""), z.coerce.number().min(0).max(100)]),
  measurement_period: optionalText(80, "Measurement period"),
}).strict();

export const founderDraftSchema = z.object({
  name: text(2, 80, "Startup name", true),
  tagline: text(10, 180, "Tagline", true),
  sector: z.enum(founderSectors),
  other_sector: optionalText(60, "Other sector"),
  stage: z.enum(founderStages),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose a valid country."),
  city: optionalText(80, "City"),
  problem: optionalText(2_000, "Problem statement"),
  solution: optionalText(2_000, "Solution"),
  team: z.array(teamMemberSchema).max(5),
  ask_amount_minor: optionalMoney,
  ask_currency: z.enum(["NGN", "USD"]),
  use_of_funds: optionalText(1_000, "Use of funds"),
  market: marketSchema,
  traction: tractionSchema,
  business_model: optionalText(1_500, "Business model"),
  competition: optionalText(1_500, "Competition"),
}).strict().superRefine((profile, context) => {
  if (profile.sector === "other" && Array.from(profile.other_sector).length < 2) {
    context.addIssue({ code: "custom", path: ["other_sector"], message: "Describe the sector in at least 2 characters." });
  }

  const marketValues = [profile.market.tam_minor, profile.market.sam_minor, profile.market.som_minor];
  if (marketValues.some(Boolean) && !profile.market.currency) {
    context.addIssue({ code: "custom", path: ["market", "currency"], message: "Choose a currency for the market figures." });
  }
  const [tam, sam, som] = marketValues.map(minorUnits);
  if (tam !== null && sam !== null && tam < sam) context.addIssue({ code: "custom", path: ["market", "tam_minor"], message: "TAM must be greater than or equal to SAM." });
  if (sam !== null && som !== null && sam < som) context.addIssue({ code: "custom", path: ["market", "sam_minor"], message: "SAM must be greater than or equal to SOM." });
});

export type FounderDraft = z.infer<typeof founderDraftSchema>;

export const reviewableFounderDraftSchema = founderDraftSchema.superRefine((profile, context) => {
  const requireLength = (value: string, min: number, path: string[], message: string) => {
    if (Array.from(value).length < min) context.addIssue({ code: "custom", path, message });
  };
  requireLength(profile.problem, 50, ["problem"], "Add at least 50 characters explaining the customer, pain, and consequence.");
  requireLength(profile.solution, 50, ["solution"], "Add at least 50 characters explaining what the solution does and why it helps.");
  requireLength(profile.use_of_funds, 30, ["use_of_funds"], "Add at least 30 characters connecting the funding ask to milestones.");
  const askAmount = minorUnits(profile.ask_amount_minor);
  if (profile.ask_amount_minor === "" || (askAmount !== null && askAmount <= BigInt(0))) {
    context.addIssue({ code: "custom", path: ["ask_amount_minor"], message: "Enter a funding ask greater than zero." });
  }
  if (profile.team.length < 1) {
    context.addIssue({ code: "custom", path: ["team"], message: "Add at least one founder or team member." });
  }
  profile.team.forEach((member, index) => {
    requireLength(member.name, 2, ["team", String(index), "name"], "Enter the team member's name.");
    requireLength(member.role, 2, ["team", String(index), "role"], "Enter the team member's role.");
    requireLength(member.relevant_experience, 20, ["team", String(index), "relevant_experience"], "Explain the relevant experience in at least 20 characters.");
  });
});

export const defaultFounderDraft: FounderDraft = {
  name: "",
  tagline: "",
  sector: "healthtech",
  other_sector: "",
  stage: "pre-seed",
  country: "NG",
  city: "",
  problem: "",
  solution: "",
  team: [{ name: "", role: "", relevant_experience: "" }],
  ask_amount_minor: "",
  ask_currency: "USD",
  use_of_funds: "",
  market: { currency: "USD", tam_minor: "", sam_minor: "", som_minor: "", explanation: "", sources: [] },
  traction: {
    evidence_note: "", interview_count: "", waitlist_count: "", loi_count: "", active_user_count: "", pilot_count: "",
    monthly_revenue_minor: "", mrr_minor: "", arr_minor: "", revenue_currency: null, growth_pct: "", retention_pct: "", measurement_period: "",
  },
  business_model: "",
  competition: "",
};

export function majorToMinor(value: string) {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return "";
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return normalized;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return (BigInt(match[1]) * BigInt(100) + BigInt(fraction || "0")).toString();
}

export function minorToMajor(value: string) {
  if (!value || !/^\d+$/.test(value)) return value;
  const amount = BigInt(value);
  const whole = amount / BigInt(100);
  const fraction = (amount % BigInt(100)).toString().padStart(2, "0");
  return fraction === "00" ? whole.toString() : `${whole}.${fraction.replace(/0$/, "")}`;
}

export function draftFromFormData(formData: FormData): unknown {
  const value = (name: string) => String(formData.get(name) ?? "");
  const nullable = (name: string) => value(name) || null;
  const team = Array.from({ length: 5 }, (_, index) => ({
    name: value(`team.${index}.name`),
    role: value(`team.${index}.role`),
    relevant_experience: value(`team.${index}.relevant_experience`),
  })).filter((member, index) => index === 0 || Object.values(member).some(Boolean));
  const sources = Array.from({ length: 3 }, (_, index) => ({ label: value(`source.${index}.label`), url: value(`source.${index}.url`) }))
    .filter((source) => source.label || source.url);

  return {
    name: value("name"), tagline: value("tagline"), sector: value("sector"), other_sector: value("other_sector"),
    stage: value("stage"), country: value("country"), city: value("city"), problem: value("problem"), solution: value("solution"), team,
    ask_amount_minor: majorToMinor(value("ask_amount")), ask_currency: value("ask_currency"), use_of_funds: value("use_of_funds"),
    market: {
      currency: nullable("market.currency"), tam_minor: majorToMinor(value("market.tam")), sam_minor: majorToMinor(value("market.sam")),
      som_minor: majorToMinor(value("market.som")), explanation: value("market.explanation"), sources,
    },
    traction: {
      evidence_note: value("traction.evidence_note"), interview_count: value("traction.interview_count"), waitlist_count: value("traction.waitlist_count"),
      loi_count: value("traction.loi_count"), active_user_count: value("traction.active_user_count"), pilot_count: value("traction.pilot_count"),
      monthly_revenue_minor: value("traction.monthly_revenue_minor"), mrr_minor: value("traction.mrr_minor"), arr_minor: value("traction.arr_minor"),
      revenue_currency: nullable("traction.revenue_currency"), growth_pct: value("traction.growth_pct"), retention_pct: value("traction.retention_pct"),
      measurement_period: value("traction.measurement_period"),
    },
    business_model: value("business_model"), competition: value("competition"),
  };
}

export function flattenProfileErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
