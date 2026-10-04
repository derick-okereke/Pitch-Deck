import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { postAuthDestination } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false, follow: false }, referrer: "no-referrer" };

async function confirmEmail(formData: FormData) {
  "use server";

  const tokenHash = formData.get("token_hash");
  if (typeof tokenHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(tokenHash)) redirect("/auth/auth-code-error");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.user) redirect("/auth/auth-code-error");

  const { data: account } = await supabase
    .from("accounts")
    .select("role, organization_name")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(account ? postAuthDestination({ role: account.role, organizationName: account.organization_name }) : "/onboarding");
}

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash: tokenHash } = await searchParams;
  if (!tokenHash || !/^[a-fA-F0-9]{64}$/.test(tokenHash)) redirect("/auth/auth-code-error");

  return <AuthShell eyebrow="One last step" title="Confirm your email." intro="Choose the button below to activate your account and continue to your workspace.">
    <form action={confirmEmail} className="auth-state-card">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <button className="button button-dark" type="submit">Confirm email and continue</button>
      <p>Already confirmed? <Link href="/auth/sign-in">Sign in instead.</Link></p>
    </form>
  </AuthShell>;
}
