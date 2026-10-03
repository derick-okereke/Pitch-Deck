import { ReturnStatus } from "./return-status";

export default async function BillingReturnPage({ searchParams }: { searchParams: Promise<{ checkout_id?: string }> }) {
  const { checkout_id: checkoutId } = await searchParams;
  return <main className="billing-return-page">{checkoutId ? <ReturnStatus checkoutId={checkoutId} /> : <div className="return-state"><p className="eyebrow">Checkout return</p><h1>No checkout was supplied.</h1><p>Open your plan page to begin or review the Founder Pro sandbox flow.</p></div>}</main>;
}
