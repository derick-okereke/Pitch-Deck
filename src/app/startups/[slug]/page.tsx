import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, CircleCheck, Info, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { startups } from "@/data/startups";

export function generateStaticParams() { return startups.map(({ slug }) => ({ slug })); }

export default async function StartupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = startups.find((item) => item.slug === slug);
  if (!startup) notFound();

  return (
    <div className="page-canvas"><div className="page-shell">
      <section className="app-panel startup-detail-panel">
        <SiteHeader />
        <Link className="back-link" href="/discover"><ArrowLeft size={16} /> Back to discovery</Link>
        <div className="startup-hero">
          <div>
            <div className="detail-badges"><span>Illustrative demo</span>{startup.verified && <span className="verified-badge"><i /> Verified pitch-ready</span>}</div>
            <p className="eyebrow">{startup.sector} · {startup.stage}</p><h1>{startup.name}</h1>
            <p className="startup-detail-tagline">{startup.tagline}</p>
            <div className="detail-meta"><span><MapPin size={15} />{startup.location}</span><span>Raising <strong>{startup.ask}</strong></span></div>
          </div>
          <aside className="score-panel">
            <div className="score-ring" style={{ "--score": `${startup.score * 3.6}deg` } as React.CSSProperties}><div><strong>{startup.score}</strong><span>/ 100</span></div></div>
            <p>Pitch-Readiness Score</p><span className="score-date">Reviewed 24 Sep 2026</span>
          </aside>
        </div>
      </section>

      <main className="detail-layout">
        <div className="detail-main">
          <section className="detail-section"><p className="section-number">01 / THE CASE</p><h2>The problem</h2><p>{startup.problem}</p><h2>The solution</h2><p>{startup.solution}</p></section>
          <section className="detail-section"><p className="section-number">02 / EVIDENCE</p><h2>Traction and proof</h2><p>{startup.traction}</p><div className="evidence-note"><Info size={18} /><p><strong>Demo data is labelled.</strong> This profile shows the structure investors will inspect. It does not claim real customers, revenue, or investment.</p></div></section>
          <section className="detail-section">
            <p className="section-number">03 / READINESS BREAKDOWN</p>
            <div className="score-breakdown">
              {[["Clarity", 16, 20], ["Market", 11, 15], ["Traction", 15, 20], ["Team", 12, 15], ["Business model", 8, 10], ["Competition", 8, 10], ["Delivery", 8, 10]].map(([label, value, max]) => (
                <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${(Number(value) / Number(max)) * 100}%` }} /></div><strong>{value} / {max}</strong></div>
              ))}
            </div>
            <p className="score-explainer"><ShieldCheck size={18} />The badge means this profile passed content review and the founder completed an eligible practice session. It does not predict investment returns or verify every business claim.</p>
          </section>
        </div>
        <aside className="intro-card">
          <p className="eyebrow">Private introduction</p><h2>Interested in the case?</h2>
          <p>Send a short note. If the founder accepts, the conversation opens inside Pitch Deck without exposing either party’s contact details.</p>
          <Link href="/auth/sign-up?role=investor" className="button button-dark">Request introduction <ArrowRight size={16} /></Link>
          <ul><li><LockKeyhole size={15} /> Investor Pro feature</li><li><CircleCheck size={15} /> Founder replies for free</li></ul><hr />
          <div className="audio-preview"><AudioLines size={20} /><div><strong>Founder pitch recording</strong><span>Available after sign in</span></div></div>
        </aside>
      </main>
      <SiteFooter />
    </div></div>
  );
}
