"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicationState = { status: "idle" | "error" | "published"; message: string };

export async function publishFounderReview(_previousState: PublicationState, formData: FormData): Promise<PublicationState> {
  const account = await getCurrentAccount();
  if (!account || account.role !== "founder") return { status: "error", message: "Sign in as the founder before publishing." };
  const reviewId = z.uuid().safeParse(formData.get("review_id"));
  if (!reviewId.success) return { status: "error", message: "This review link is invalid. Reload the review and try again." };
  const { error } = await createAdminClient().rpc("publish_founder_review", {
    p_founder_id: account.id, p_review_id: reviewId.data,
  });
  if (error) {
    console.error("Founder publication failed", { code: error.code });
    return { status: "error", message: "The profile could not be published. A completed review with at least 50 content points is required. Reload and try again." };
  }
  revalidatePath("/founder");
  revalidatePath("/founder/profile/preview");
  revalidatePath("/founder/reviews");
  revalidatePath(`/founder/reviews/${reviewId.data}`);
  revalidatePath("/discover");
  return { status: "published", message: "This reviewed revision is now published in investor discovery." };
}
