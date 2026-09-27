import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth";

export type AccountRole = "founder" | "investor";

export type CurrentAccount = {
  id: string;
  email: string | null;
  role: AccountRole | null;
  displayName: string;
  organizationName: string | null;
  createdAt: string;
};

export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const user = await getVerifiedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, role, display_name, organization_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    email: user.email,
    role: data.role,
    displayName: data.display_name,
    organizationName: data.organization_name,
    createdAt: data.created_at,
  };
});

export function accountHome(account: Pick<CurrentAccount, "role" | "organizationName">) {
  if (!account.organizationName) return "/onboarding";
  return account.role === "investor" ? "/discover" : "/founder";
}
