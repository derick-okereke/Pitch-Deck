"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accountHome } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  message?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(12, "Use at least 12 characters.").max(128, "Use no more than 128 characters.");
const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(80),
  email,
  password,
  role: z.enum(["founder", "investor"]),
});
const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) });

function baseUrl(origin: string | null) {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return origin?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function errors(error: z.ZodError): AuthFormState {
  return { message: "Check the highlighted fields and try again.", fieldErrors: error.flatten().fieldErrors };
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return errors(parsed.error);

  const headerStore = await headers();
  const supabase = await createClient();
  const { error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${baseUrl(headerStore.get("origin"))}/auth/callback`,
      data: { display_name: parsed.data.displayName, role: parsed.data.role },
    },
  });

  if (signUpError) return { message: "We could not create that account. Check your details or try signing in." };
  redirect(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return errors(parsed.error);

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
  if (signInError || !data.user) return { message: "The email or password was not accepted." };

  const { data: account } = await supabase
    .from("accounts")
    .select("role, organization_name")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!account) return { message: "Your account workspace is still being prepared. Try again shortly." };
  redirect(accountHome({ role: account.role, organizationName: account.organization_name }));
}

export async function requestPasswordReset(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { message: "Enter a valid email address.", fieldErrors: { email: [parsed.error.issues[0].message] } };

  const headerStore = await headers();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${baseUrl(headerStore.get("origin"))}/auth/callback?next=/auth/update-password`,
  });
  return { success: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return { message: parsed.error.issues[0].message, fieldErrors: { password: [parsed.error.issues[0].message] } };

  const supabase = await createClient();
  const { data, error: updateError } = await supabase.auth.updateUser({ password: parsed.data });
  if (updateError || !data.user) return { message: "This reset session is invalid or expired. Request a new reset email." };
  const { data: account } = await supabase.from("accounts").select("role, organization_name").eq("id", data.user.id).maybeSingle();
  redirect(account ? accountHome({ role: account.role, organizationName: account.organization_name }) : "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
