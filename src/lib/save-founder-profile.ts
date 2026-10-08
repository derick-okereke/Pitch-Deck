import "server-only";

import { founderContentHash } from "@/lib/profile-content";
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
import { profileReviewFailureCode } from "@/lib/profile-review";
import type { ProfileActionState } from "@/lib/profile-action-state";
import { createAdminClient } from "@/lib/supabase/admin";

function expectedVersion(formData: FormData) {
  const value = Number(formData.get("expected_version"));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function isVersionConflict(message: string | undefined) {
  return message?.includes("DRAFT_VERSION_CONFLICT") ?? false;
}

function reviewFailureDiagnostic(error: unknown) {
  if (!error || typeof error !== "object") return { errorName: "UnknownError" };
  const details = error as Record<string, unknown>;
  const body = details.error && typeof details.error === "object" ? details.error as Record<string, unknown> : null;
  const providerError = body?.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
  const code = providerError?.code ?? details.code;
  return {
    errorName: error instanceof Error ? error.name : "ProviderError",
    status: typeof details.status === "number" ? details.status : undefined,
    code: typeof code === "string" ? code : undefined,
    failureCode: profileReviewFailureCode(error),
  };
}

export async function saveFounderProfile(formData: FormData): Promise<ProfileActionState> {
  const account = await getCurrentAccount();
  if (!account || account.role !== "founder") {
    return { status: "error", message: "Your session has expired. Sign in again, then return to save the recovered draft." };
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

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("save_founder_draft", {
    p_founder_id: account.id,
    p_expected_version: version,
    p_payload: draftResult.data as unknown as Json,
  });
  if (error || !data?.[0]) {
    if (isVersionConflict(error?.message)) {
      return {
        status: "conflict",
        message: "A newer draft was saved elsewhere. Your browser copy is safe; reload to compare before trying again.",
      };
    }
    throw new Error("SAVE_FOUNDER_DRAFT_FAILED", { cause: error });
  }

  const saved = data[0];
  revalidatePath("/founder");
  revalidatePath("/founder/profile/edit");
  revalidatePath("/founder/profile/preview");
  revalidatePath("/founder/reviews");

  if (intent === "save") {
    return {
      status: "saved",
      message: "Draft saved just now",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
    };
  }

  const contentHash = founderContentHash(draftResult.data);
  const { data: reviewData, error: reviewError } = await admin.rpc("begin_profile_review", {
    p_founder_id: account.id,
    p_startup_id: saved.startup_id,
    p_draft_version: saved.draft_version,
    p_content_hash: contentHash,
    p_rubric_version: "readiness-v1",
    p_prompt_version: "profile-review-v1",
  });

  if (reviewError || !reviewData?.[0]) {
    console.error("Profile review start failed", {
      code: reviewError?.code,
      message: reviewError?.message,
      startupId: saved.startup_id,
      draftVersion: saved.draft_version,
    });
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
    revalidatePath("/founder/reviews");
    revalidatePath(`/founder/reviews/${review.review_id}`);
    return {
      status: "review_ready",
      message: "Review complete. Open it to inspect every rating and evidence quote.",
      draftVersion: saved.draft_version,
      startupId: saved.startup_id,
      reviewId: review.review_id,
    };
  } catch (error) {
    console.error("Profile review failed", { reviewId: review.review_id, ...reviewFailureDiagnostic(error) });
    try {
      await admin.rpc("fail_profile_review", {
        p_review_id: review.review_id,
        p_error_code: profileReviewFailureCode(error) === "provider_schema_rejected" ? "PROVIDER_SCHEMA_REJECTED" : "PROVIDER_UNAVAILABLE",
      });
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
