import "server-only";
import type { FounderWorkspace } from "@/lib/founder-profile";
import { founderContentHash } from "@/lib/profile-content";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentFounderReview(workspace: FounderWorkspace) {
  if (!workspace.startupId || workspace.loadError) return null;
  const supabase = await createClient();
  const { data: revision, error } = await supabase.from("profile_revisions")
    .select("id, revision_number, content_hash")
    .eq("startup_id", workspace.startupId)
    .eq("content_hash", founderContentHash(workspace.draft)).maybeSingle();
  if (error) throw new Error("Founder revision could not be loaded.");
  if (!revision) return null;
  const { data: review, error: reviewError } = await supabase.from("profile_reviews")
    .select("id, content_points, ratings, completed_at, state")
    .eq("revision_id", revision.id).eq("rubric_version", "readiness-v1").maybeSingle();
  if (reviewError) throw new Error("Founder review could not be loaded.");
  return review ? { ...review, revisionId: revision.id, revisionNumber: revision.revision_number } : null;
}

export async function getFounderReviewHistory(workspace: FounderWorkspace) {
  if (!workspace.startupId) return [];
  const supabase = await createClient();
  const { data: revisions, error } = await supabase.from("profile_revisions")
    .select("id, revision_number, content_hash").eq("startup_id", workspace.startupId)
    .order("revision_number", { ascending: false });
  if (error) throw new Error("Founder revisions could not be loaded.");
  if (!revisions?.length) return [];
  const { data: reviews, error: reviewError } = await supabase.from("profile_reviews")
    .select("id, revision_id, state, content_points, completed_at")
    .in("revision_id", revisions.map((revision) => revision.id)).eq("rubric_version", "readiness-v1");
  if (reviewError) throw new Error("Founder reviews could not be loaded.");
  const currentHash = founderContentHash(workspace.draft);
  return revisions.flatMap((revision) => {
    const review = reviews?.find((item) => item.revision_id === revision.id);
    return review ? [{ ...review, revisionNumber: revision.revision_number, matchesDraft: revision.content_hash === currentHash, published: revision.id === workspace.publishedRevisionId && workspace.publicationStatus === "published" }] : [];
  });
}
