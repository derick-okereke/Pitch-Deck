import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { accountHome } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
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
      const requested = safeNext(url.searchParams.get("next"));
      if (requested) return NextResponse.redirect(new URL(requested, url.origin));
      const { data: account } = await supabase
        .from("accounts")
        .select("role, organization_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const destination = account
        ? accountHome({ role: account.role, organizationName: account.organization_name })
        : "/founder";
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/auth/auth-code-error", url.origin));
}
