"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { accountHome, getCurrentAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const schema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(80),
  organizationName: z.string().trim().min(2, "Enter the organization name.").max(120),
});

export async function completeOnboarding(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");

  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) {
    return {
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      display_name: parsed.data.displayName,
      organization_name: parsed.data.organizationName,
    })
    .eq("id", account.id);

  if (error) return { message: "Your workspace details could not be saved. Try again." };
  redirect(accountHome({ ...account, organizationName: parsed.data.organizationName }));
}
