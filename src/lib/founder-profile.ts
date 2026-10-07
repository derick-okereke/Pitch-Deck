import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth";
import { defaultFounderDraft, founderDraftSchema, type FounderDraft } from "@/lib/profile";

export type FounderWorkspace = {
  ownerId: string;
  startupId: string | null;
  draftVersion: number;
  publicationStatus: "draft" | "published" | "unpublished";
  publishedRevisionId: string | null;
  draft: FounderDraft;
  loadError: boolean;
};

export async function getFounderWorkspace(): Promise<FounderWorkspace> {
  const user = await getVerifiedUser();
  const ownerId = user?.id ?? "signed-out";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("startups")
    .select("id, draft_payload, draft_version, publication_status, published_revision_id")
    .eq("founder_id", ownerId)
    .maybeSingle();

  if (error) {
    return {
      ownerId,
      startupId: null,
      draftVersion: 0,
      publicationStatus: "draft",
      publishedRevisionId: null,
      draft: defaultFounderDraft,
      loadError: true,
    };
  }
  if (!data) {
    return {
      ownerId,
      startupId: null,
      draftVersion: 0,
      publicationStatus: "draft",
      publishedRevisionId: null,
      draft: defaultFounderDraft,
      loadError: false,
    };
  }

  const parsed = founderDraftSchema.safeParse(data.draft_payload);
  return {
    ownerId,
    startupId: data.id,
    draftVersion: data.draft_version,
    publicationStatus: data.publication_status,
    publishedRevisionId: data.published_revision_id,
    draft: parsed.success ? parsed.data : defaultFounderDraft,
    loadError: !parsed.success,
  };
}
