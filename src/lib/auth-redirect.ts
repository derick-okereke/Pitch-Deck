import type { AccountRole } from "@/lib/account";

const allowedDestinations = new Set([
  "/discover",
  "/founder",
  "/founder/profile/edit",
  "/founder/profile/preview",
  "/investor/profile",
  "/inbox",
  "/onboarding",
  "/simulator/new",
]);

export function safeAuthNext(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !allowedDestinations.has(value)) return null;
  return value;
}

export function postAuthDestination(
  account: { role: AccountRole | null; organizationName: string | null },
  requested?: string | null,
) {
  if (!account.organizationName) return "/onboarding";
  const destination = safeAuthNext(requested);
  if (account.role === "investor") {
    return destination === "/discover" || destination === "/investor/profile" || destination === "/inbox" ? destination : "/discover";
  }
  return destination && destination !== "/discover" && destination !== "/onboarding"
    ? destination
    : "/founder";
}
