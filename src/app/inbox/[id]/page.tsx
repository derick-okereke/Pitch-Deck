import { notFound } from "next/navigation";
import { z } from "zod";
import { InboxShell } from "@/components/inbox/inbox-shell";
import { getConversationAccount, getConversationDetail, getConversationList } from "@/lib/conversation-data";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const account = await getConversationAccount();
  const [conversations, detail] = await Promise.all([getConversationList(), getConversationDetail(id)]);
  if (!detail) notFound();
  return <InboxShell key={detail.id} account={account!} conversations={conversations} detail={detail} loadError={false} />;
}
