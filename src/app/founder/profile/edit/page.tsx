import { getFounderWorkspace } from "@/lib/founder-profile";
import { ProfileEditor } from "./profile-editor";

export default async function ProfileEditorPage() {
  const workspace = await getFounderWorkspace();
  return <ProfileEditor workspace={workspace} />;
}
