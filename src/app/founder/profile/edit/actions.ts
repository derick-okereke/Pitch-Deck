"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentAccount } from "@/lib/account";
import { reviewFounderProfile } from "@/lib/providers/groq";
import {
  draftFromFormData,
  flattenProfileErrors,
  founderDraftSchema,
  reviewableFounderDraftSchema,
} from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileActionState = {
  status: "idle" | "saved" | "reviewing" | "review_ready" | "conflict" | "error";
  message: string;
  draftVersion?: number;
  startupId?: string;
  reviewId?: string;
  fieldErrors?: Record<string, string>;
};

export const initialProfileActionState: ProfileActionState = {
  status: "idle",
  message: "All changes saved",
};

function expectedVersion(formData: FormData) {
  const value = Number(formData.get("expected_version"));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function isVersionConflict(message: string | undefined) {
  return message?.includes("DRAFT_VERSION_CONFLICT") ?? false;
}

export async function saveFounderProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const account = await getCurrentAccount();
  if (!account || account.role !== "founder") {
    return { status: "error", message: "Sign in with a founder account to save this profile." };
  }

  const version = expectedVersion(formData);
  if (version === null) return { status: "error", message: "The draft version is invalid. Reload before saving." };

  const draftResult = founderDraftSchema.safeParse(draftFromFormData(formData));
  if (!draftResult.success) {
    return {
      status: "error",
      message: "Check the highlighted fields. Your changes are still in this browser.",
      fieldErrors: flattenProfileErrors(draftResult.error),
    };
  }

  const intent = formData.get("intent") === "review" ? "review" : "save";
  if (intent === "review") {
    const reviewResult = reviewableFounderDraftSchema.safeParse(draftResult.data);
    if (!reviewResult.success) {
      return {
        status: "error",
        message: "Complete the review requirements before submitting. Your draft has not been sent.",
        fieldErrors: flattenProfileErrors(reviewResult.error),
      };
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { status: "error", message: "Profile storage is not configured in this environment. Your changes remain in this browser." };
  }
  const { data, error } = await admin.rpc("save_founder_draft", {
    p_founder_id: account.id,
    p_expected_version: version,
    p_payload: draftResult.data as unknown as Json,
  });
  if (error || !data?.[0]) {
    if (isVersionConflict(error?.message)) {
      return {
        status: "conflict",
        message: "A newer draft was saved elsewhere. Copy any unsaved text, then reload before trying again.",
      };
    }
    return {
      status: "error",
      message: "The draft could not be saved. Your changes are still in this browser; try again.",
    };
  }

  const saved = data[0];
  revalidatePath("/founder");
  revalidatePath("/founder/profile/edit");
  revalidatePath("/founder/profile/preview");

  if (intent === "save") {
    return {
      status: "saved",
      message: "Draft saved just now",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
    };
  }

  const contentHash = createHash("sha256").update(JSON.stringify(draftResult.data)).digest("hex");
  const { data: reviewData, error: reviewError } = await admin.rpc("begin_profile_review", {
    p_founder_id: account.id,
    p_startup_id: saved.startup_id,
    p_draft_version: saved.draft_version,
    p_content_hash: contentHash,
    p_rubric_version: "readiness-v1",
    p_prompt_version: "profile-review-v1",
  });

  if (reviewError || !reviewData?.[0]) {
    return {
      status: "error",
      message: "Your draft was saved, but review could not start. Try submitting it again.",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
    };
  }

  const review = reviewData[0];
  revalidatePath(`/founder/reviews/${review.review_id}`);
  if (review.reused && review.review_state !== "reviewing") {
    return {
      status: "review_ready",
      message: "This unchanged revision already has a completed review.",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
      reviewId: review.review_id,
    };
  }

  try {
    const result = await reviewFounderProfile(draftResult.data);
    const ratings = result.categories.map((category) => ({
      key: category.key,
      rating: category.rating,
      rationale: category.rationale,
      next_step: category.next_step,
    }));
    const evidence = result.categories.map((category) => ({ key: category.key, evidence: category.evidence }));
    const { error: completionError } = await admin.rpc("complete_profile_review", {
      p_review_id: review.review_id,
      p_model_id: result.modelId,
      p_ratings: ratings as unknown as Json,
      p_evidence: evidence as unknown as Json,
      p_flags: result.flags as unknown as Json,
      p_content_points: result.contentPoints,
    });
    if (completionError) throw completionError;
    revalidatePath("/founder");
    revalidatePath("/founder/profile/preview");
    revalidatePath(`/founder/reviews/${review.review_id}`);
    return {
      status: "review_ready",
      message: "Review complete. Open it to inspect every rating and evidence quote.",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
      reviewId: review.review_id,
    };
  } catch {
    try {
      await admin.rpc("fail_profile_review", { p_review_id: review.review_id, p_error_code: "PROVIDER_UNAVAILABLE" });
    } catch {
      // The user-facing result stays truthful even if failure persistence is unavailable.
    }
    revalidatePath(`/founder/reviews/${review.review_id}`);
    return {
      status: "error",
      message: "Your draft was saved, but the review provider did not complete. Open the review status and retry later.",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
      reviewId: review.review_id,
    };
  }
}
