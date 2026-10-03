import { redirect } from "next/navigation";
import { discoveryFilterSchema, type DiscoveryResult } from "@/lib/marketplace";
import { getDiscovery, getInvestorAccess } from "@/lib/marketplace-data";
import { DiscoveryExplorer } from "./discovery-explorer";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function all(value: string | string[] | undefined) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") redirect("/auth/sign-in?next=/discover");
  if (access.status === "onboarding") redirect("/onboarding");
  if (access.status === "wrong_role") redirect("/auth/sign-in?role=investor&next=/discover");
  if (access.status === "profile_required") redirect("/investor/profile?setup=1");

  const params = await searchParams;
  const parsed = discoveryFilterSchema.safeParse({
    q: first(params.q) ?? "",
    sectors: all(params.sector),
    stages: all(params.stage),
    countries: all(params.country),
    ask_currency: first(params.ask_currency) ?? "",
    ask_min: first(params.ask_min) ?? "",
    ask_max: first(params.ask_max) ?? "",
    minimum_score: first(params.minimum_score) ?? "",
    verified_only: first(params.verified_only) ?? "",
    page: first(params.page) ?? "1",
  });
  const filters = parsed.success ? parsed.data : discoveryFilterSchema.parse({});
  let result: DiscoveryResult = { items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 };
  let loadError = false;
  let filterIssue: "invalid" | "pro_required" | null = parsed.success ? null : "invalid";
  try { result = await getDiscovery(filters); } catch (error) {
    if (error instanceof Error && error.message === "INVESTOR_PRO_REQUIRED") {
      filterIssue = "pro_required";
      result = await getDiscovery({ ...filters, countries: [], ask_currency: "", ask_min: null, ask_max: null, minimum_score: null, verified_only: false });
    } else loadError = true;
  }
  const key = JSON.stringify(filters);
  return <DiscoveryExplorer key={key} filters={filters} result={result} loadError={loadError} filterIssue={filterIssue} accountName={access.account.displayName} demoPro={access.demoPro} demoProExpiresAt={access.demoProExpiresAt} />;
}
