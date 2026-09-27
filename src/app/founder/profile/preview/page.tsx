import Link from "next/link";
import { ArrowLeft, AudioLines, Eye, FilePenLine, Info, MapPin } from "lucide-react";
import { contentScore, founderProfile, reviewCategories } from "@/data/founder-demo";

export default function ProfilePreview() {
  const displayScore = Math.floor(contentScore + 0.5);
  return (
    <main className="preview-page">
      <div className="preview-banner"><div><Eye size={18} /><span><strong>Investor preview</strong> · Published revision 3</span></div><p>Private coaching notes, contact details, and simulator Q&A are never shown here.</p><Link href="/founder/profile/edit"><FilePenLine size={15} /> Edit draft</Link></div>
      <section className="founder-preview-hero">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="preview-hero-grid"><div><p className="eyebrow">Illustrative demo profile · {founderProfile.sector} · {founderProfile.stage}</p><h1>{founderProfile.name}</h1><p>{founderProfile.tagline}</p><div className="detail-meta"><span><MapPin size={15} />{founderProfile.city}, {founderProfile.country}</span><span>Raising <strong>{founderProfile.ask}</strong></span></div></div><aside className="score-panel"><div className="score-ring" style={{ "--score": `${displayScore * 3.6}deg` } as React.CSSProperties}><div><strong>{displayScore}</strong><span>/ 100</span></div></div><p>Pitch-Readiness Score</p><span className="score-date">Content assessed 24 Sep 2026</span></aside></div>
      </section>
      <section className="preview-content-grid">
        <div className="preview-narrative"><article><p className="section-number">01 / THE CASE</p><h2>The problem</h2><p>{founderProfile.problem}</p><h2>The solution</h2><p>{founderProfile.solution}</p></article><article><p className="section-number">02 / MARKET EVIDENCE</p><h2>Market</h2><p>{founderProfile.market}</p><h2>Traction</h2><p>{founderProfile.traction}</p></article><article><p className="section-number">03 / TEAM & MODEL</p><h2>Team</h2><p>{founderProfile.team}</p><h2>Business model</h2><p>{founderProfile.businessModel}</p><h2>Competition</h2><p>{founderProfile.competition}</p></article></div>
        <aside className="preview-evidence"><p className="eyebrow">Readiness evidence</p>{reviewCategories.map((category) => <div className="mini-score-row" key={category.label}><span>{category.label}</span><div><i style={{ width: `${(category.score / category.max) * 100}%` }} /></div><strong>{category.score}/{category.max}</strong></div>)}<div className="score-disclosure"><Info size={15} /><p>AI-assessed pitch readiness; business claims are self-reported. Delivery is 0/10 until an eligible Pro session matches this published revision.</p></div><hr /><div className="audio-empty"><AudioLines size={20} /><div><strong>No public pitch recording</strong><span>The founder chooses an eligible recording explicitly.</span></div></div></aside>
      </section>
    </main>
  );
}
