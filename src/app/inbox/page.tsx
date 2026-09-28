import { InboxShell } from "@/components/inbox/inbox-shell";
import type { ConversationSummary } from "@/lib/conversation";
import { getConversationAccount, getConversationList } from "@/lib/conversation-data";

export default async function InboxPage() {
  const account = await getConversationAccount();
  let conversations: ConversationSummary[] = [];
  let loadError = false;
  try { conversations = await getConversationList(); } catch { loadError = true; }
  return <InboxShell key="inbox-index" account={account!} conversations={conversations} detail={null} loadError={loadError} />;
}
