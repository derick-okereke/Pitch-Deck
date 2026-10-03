import { BadgeCheck, Check, Clock3, CreditCard, ShieldCheck } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { getFounderBillingOverview } from "@/lib/billing";
import { UpgradeButton } from "./upgrade-button";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}
export default async function FounderBillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const account = await getCurrentAccount();
  if (!account) return null;
  const billing = await getFounderBillingOverview(account.id);
  const query = await searchParams;

  return (
    <main className="billing-page">
      <section className="billing-intro">
        <div>
          <p className="eyebrow">Plan and practice</p>
          <h1>{billing.active ? "Founder Pro is active." : "Practice without the lifetime cap."}</h1>
          <p>Founder Pro makes new simulator sessions score-eligible while your paid sandbox period is active. Readiness and the verified badge still have to be earned through your profile and pitch evidence.</p>
        </div>
        <div className={`billing-status billing-status-${billing.status}`}>
          {billing.active ? <BadgeCheck size={20} /> : billing.status === "pending" ? <Clock3 size={20} /> : <CreditCard size={20} />}
          <div><span>Current plan</span><strong>{billing.active ? "Founder Pro" : billing.status === "pending" ? "Verification pending" : "Founder Free"}</strong></div>
        </div>
      </section>

      {query.checkout === "cancelled" ? <div className="billing-notice" role="status"><strong>Checkout closed.</strong><span>No plan change was made. You can return to the sandbox flow whenever you’re ready.</span></div> : null}

      <section className="billing-plan-grid">
        <article className="billing-plan-card billing-plan-current">
          <div className="billing-plan-heading"><div><p>Founder Free</p><h2>$0</h2><span>Learning access</span></div>{!billing.active ? <small>Current plan</small> : null}</div>
          <ul>
            <li><Check size={16} /> Three completed practice sessions, lifetime</li>
            <li><Check size={16} /> Full private coaching reports</li>
            <li><Check size={16} /> Profile review and publication</li>
          </ul>
          <p className="billing-plan-note">Free-session results remain learning-only and contribute no delivery points.</p>
        </article>

        <article className="billing-plan-card billing-plan-pro">
          <div className="billing-plan-heading"><div><p>Founder Pro</p><h2>$3 <span>USD / month</span></h2><span>Sandbox recurring checkout</span></div>{billing.active ? <small><BadgeCheck size={13} /> Active</small> : null}</div>
          <ul>
            <li><Check size={16} /> No advertised monthly practice cap</li>
            <li><Check size={16} /> New Pro sessions can contribute delivery points</li>
            <li><Check size={16} /> Eligible results can earn the verified badge</li>
          </ul>
          {billing.active && billing.paidThrough ? (
            <div className="billing-period"><ShieldCheck size={18} /><div><strong>Verified through {date(billing.paidThrough)}</strong><span>{billing.cancelAtPeriodEnd ? "Cancellation scheduled at period end." : "Sandbox subscription verified by Bachs."}</span></div></div>
          ) : billing.status === "pending" ? (
            <div className="billing-period"><Clock3 size={18} /><div><strong>Waiting for Bachs verification</strong><span>Keep this page; access updates after the signed webhook is checked.</span></div></div>
          ) : <UpgradeButton />}
        </article>
      </section>

      <section className="billing-disclosure">
        <ShieldCheck size={19} />
        <div><strong>Sandbox only. No real money moves.</strong><p>The checkout uses a Bachs test product, test credentials, and an isolated sandbox key. A return-page URL cannot activate Pro; only a signed event matched to the server-created checkout can do that.</p></div>
      </section>
    </main>
  );
}
