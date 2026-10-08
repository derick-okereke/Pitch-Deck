import { Info } from "lucide-react";
import { minorToMajor, type FounderDraft } from "@/lib/profile";

function money(amount: string, currency: "NGN" | "USD" | null) {
  if (!amount) return "Not stated";
  const formatted = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(Number(minorToMajor(amount)));
  return currency === "USD" ? `$${formatted} USD` : currency === "NGN" ? `NGN ${formatted}` : `${formatted} (currency not stated)`;
}

function Metrics({ values }: { values: Array<[string, string | number]> }) {
  const provided = values.filter(([, value]) => value !== "");
  if (!provided.length) return null;
  return <dl className="detail-metrics">{provided.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function StartupProfileEvidence({ profile, isDemo }: { profile: FounderDraft; isDemo: boolean }) {
  const { market, traction } = profile;
  const revenue = (amount: string) => amount ? money(amount, traction.revenue_currency) : "";

  return <>
    <section className="detail-section">
      <h2>Market</h2>
      <p>{market.explanation || "No market explanation was included in this published revision."}</p>
      <Metrics values={[
        ["Total addressable market (TAM)", market.tam_minor ? money(market.tam_minor, market.currency) : ""],
        ["Serviceable available market (SAM)", market.sam_minor ? money(market.sam_minor, market.currency) : ""],
        ["Serviceable obtainable market (SOM)", market.som_minor ? money(market.som_minor, market.currency) : ""],
      ]} />
      {market.sources.length ? <div className="detail-sources"><h3>Market sources</h3><ul>{market.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></div> : null}
    </section>
    <section className="detail-section">
      <h2>Traction and proof</h2>
      <p>{traction.evidence_note || "No traction evidence was included in this published revision."}</p>
      <Metrics values={[
        ["Customer interviews", traction.interview_count],
        ["Waitlist", traction.waitlist_count],
        ["Letters of intent", traction.loi_count],
        ["Active users", traction.active_user_count],
        ["Pilots", traction.pilot_count],
        ["Monthly revenue", revenue(traction.monthly_revenue_minor)],
        ["Monthly recurring revenue (MRR)", revenue(traction.mrr_minor)],
        ["Annual recurring revenue (ARR)", revenue(traction.arr_minor)],
        ["Growth", traction.growth_pct === "" ? "" : `${traction.growth_pct}%`],
        ["Retention", traction.retention_pct === "" ? "" : `${traction.retention_pct}%`],
        ["Measurement period", traction.measurement_period],
      ]} />
      <h2>Team</h2>
      {profile.team.length ? <div className="detail-team">{profile.team.map((member, index) => <article key={`${member.name}-${index}`}><strong>{member.name}</strong><span>{member.role}</span><p>{member.relevant_experience}</p></article>)}</div> : <p>No team evidence was included in this published revision.</p>}
      <div className="evidence-note"><Info size={18} /><p><strong>{isDemo ? "Demo data is labelled." : "Claims are self-reported."}</strong> The profile passed a pitch-readiness review. Peekytoe has not independently verified business performance or investment outcomes.</p></div>
    </section>
    <section className="detail-section">
      <h2>Business model</h2>
      <p>{profile.business_model || "No business model was included in this published revision."}</p>
      <h2>Competition</h2>
      <p>{profile.competition || "No competition evidence was included in this published revision."}</p>
    </section>
    <section className="detail-section">
      <h2>Funding ask</h2>
      <p className="detail-funding-amount">{money(profile.ask_amount_minor, profile.ask_currency)}</p>
      <h3>Use of funds</h3>
      <p>{profile.use_of_funds || "No use of funds was included in this published revision."}</p>
    </section>
  </>;
}
