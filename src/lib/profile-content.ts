import { createHash } from "node:crypto";
import type { FounderDraft } from "./profile.ts";

export function founderContentHash(profile: FounderDraft) {
  return createHash("sha256").update(JSON.stringify(profile)).digest("hex");
}
