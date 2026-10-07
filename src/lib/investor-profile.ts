import { z } from "zod";
import { founderSectors, founderStages } from "./profile.ts";

export const investorTypes = ["angel", "vc-firm", "corporate-venture", "accelerator"] as const;
export const investorCountries = [
  ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"], ["ZA", "South Africa"],
  ["UG", "Uganda"], ["RW", "Rwanda"], ["TZ", "Tanzania"], ["EG", "Egypt"],
  ["GB", "United Kingdom"], ["FR", "France"], ["DE", "Germany"],
  ["NL", "Netherlands"], ["SE", "Sweden"], ["US", "United States"],
] as const;

export const sectorLabels: Record<(typeof founderSectors)[number], string> = {
  agritech: "Agritech", "climate-energy": "Climate & energy", commerce: "Commerce",
  education: "Education", fintech: "Fintech", healthtech: "Healthtech", logistics: "Logistics",
  "enterprise-software": "Enterprise software", consumer: "Consumer", other: "Other",
};

export const stageLabels: Record<(typeof founderStages)[number], string> = {
  idea: "Idea", "pre-seed": "Pre-seed", seed: "Seed", growth: "Growth",
};

export const investorTypeLabels: Record<(typeof investorTypes)[number], string> = {
  angel: "Angel investor", "vc-firm": "VC firm", "corporate-venture": "Corporate venture",
  accelerator: "Accelerator",
};

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const minorUnits = (value: string) => /^\d+$/.test(value) ? BigInt(value) : null;
const money = z.string().regex(/^\d+$/, "Enter a whole-number amount.")
  .refine((value) => {
    const amount = minorUnits(value);
    return amount === null || amount <= BigInt("100000000000000");
  }, "The amount is above the supported maximum.");

export const investorProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(80),
  investor_type: z.enum(investorTypes),
  firm_name: optionalText(120),
  professional_title: optionalText(100),
  bio: optionalText(600),
  sectors: z.array(z.enum(founderSectors)).min(1, "Choose at least one sector.").max(5, "Choose no more than five sectors."),
  stages: z.array(z.enum(founderStages)).min(1, "Choose at least one stage.").max(4),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(10),
  check_currency: z.enum(["NGN", "USD"]),
  check_min_minor: money,
  check_max_minor: money,
  linkedin_url: z.union([
    z.literal("").transform(() => null),
    z.string().trim().url("Enter a valid LinkedIn URL.").max(2_048).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && ["linkedin.com", "www.linkedin.com"].includes(url.hostname)
        && /^\/(in|company)\//.test(url.pathname);
    }, "Use an HTTPS linkedin.com/in or linkedin.com/company URL."),
  ]),
}).strict().superRefine((profile, context) => {
  const minimum = minorUnits(profile.check_min_minor);
  const maximum = minorUnits(profile.check_max_minor);
  if (minimum !== null && maximum !== null && minimum > maximum) {
    context.addIssue({ code: "custom", path: ["check_max_minor"], message: "Maximum cheque must be at least the minimum." });
  }
});

export type InvestorProfileInput = z.input<typeof investorProfileSchema>;
export type InvestorProfile = z.output<typeof investorProfileSchema>;

export function flattenInvestorErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}
