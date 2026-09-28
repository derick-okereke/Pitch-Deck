import { redirect } from "next/navigation";
import { discoveryFilterSchema, type DiscoveryResult } from "@/lib/marketplace";
import { getDiscovery, getInvestorAccess } from "@/lib/marketplace-data";
import { DiscoveryExplorer } from "./discovery-explorer";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") redirect("/auth/sign-in?next=/discover");
  if (access.status === "onboarding") redirect("/onboarding");
  if (access.status === "wrong_role") redirect("/founder");
  if (access.status === "profile_required") redirect("/investor/profile?setup=1");

  const params = await searchParams;
  const parsed = discoveryFilterSchema.safeParse({
    q: first(params.q) ?? "",
    sector: first(params.sector) ?? "",
    stage: first(params.stage) ?? "",
    page: first(params.page) ?? "1",
  });
  const filters = parsed.success ? parsed.data : discoveryFilterSchema.parse({});
  let result: DiscoveryResult = { items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 };
  let loadError = false;
  try { result = await getDiscovery(filters); } catch { loadError = true; }
  return <DiscoveryExplorer key={`${filters.q}:${filters.sector}:${filters.stage}:${filters.page}`} filters={filters} result={result} loadError={loadError} accountName={access.account.displayName} />;
}
