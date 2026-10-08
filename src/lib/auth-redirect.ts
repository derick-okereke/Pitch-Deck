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

export function authEntryRole(role?: FormDataEntryValue | string | null, next?: string | null): AccountRole | null {
  if (role === "founder" || role === "investor") return role;
  if (next === "/discover" || next === "/investor/profile") return "investor";
  if (next === "/simulator/new" || next?.startsWith("/founder")) return "founder";
  return null;
}

export function canReuseAuthSession(accountRole: AccountRole | null, entryRole: AccountRole | null) {
  return !entryRole || accountRole === entryRole;
}

export function founderEntryHref(account: { role: AccountRole | null; organizationName: string | null } | null) {
  if (account?.role === "founder") return account.organizationName ? "/simulator/new" : "/onboarding";
  return "/auth/sign-up?role=founder&next=/simulator/new";
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
