import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { postAuthDestination, safeAuthNext } from "@/lib/auth-redirect";
import { authEmailRedirectOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

async function handleGET(request: Request) {
  const url = new URL(request.url);
  // request.url can contain the hosting proxy's internal localhost origin.
  const publicOrigin = authEmailRedirectOrigin();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (code || (tokenHash && type)) {
    const supabase = await createClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as EmailOtpType });
    const { data, error } = result;
    if (!error && data.user) {
      if (type === "recovery" || url.searchParams.get("next") === "/auth/update-password") {
        return NextResponse.redirect(new URL("/auth/update-password", publicOrigin));
      }
      const requested = safeAuthNext(url.searchParams.get("next"));
      const { data: account } = await supabase
        .from("accounts")
        .select("role, organization_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const destination = account
        ? postAuthDestination({ role: account.role, organizationName: account.organization_name }, requested)
        : "/founder";
      return NextResponse.redirect(new URL(destination, publicOrigin));
    }
    // Supabase can confirm an email before this PKCE exchange runs. If the
    // verifier cookie is missing (for example, the email opened in another
    // browser), the account is usable even though automatic sign-in failed.
    if (code && error?.code === "pkce_code_verifier_not_found") {
      const signIn = new URL("/auth/sign-in", publicOrigin);
      signIn.searchParams.set("link", "session-unavailable");
      const requested = safeAuthNext(url.searchParams.get("next"));
      if (requested) signIn.searchParams.set("next", requested);
      return NextResponse.redirect(signIn);
    }
  }
  return NextResponse.redirect(new URL("/auth/auth-code-error", publicOrigin));
}

export const GET = withWatchupRequest("/auth/callback", "GET", handleGET);
