import { getCurrentAccount } from "@/lib/account";

export async function GET() {
  const account = await getCurrentAccount();
  return Response.json({ account_id: account?.id ?? null }, { headers: { "Cache-Control": "no-store" } });
}
