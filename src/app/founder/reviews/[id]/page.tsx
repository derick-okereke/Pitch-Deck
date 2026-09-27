import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, FilePenLine, Info, ShieldCheck } from "lucide-react";
import { contentScore, reviewCategories } from "@/data/founder-demo";

export function generateStaticParams() { return [{ id: "demo-review" }]; }

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  const displayScore = Math.floor(contentScore + 0.5);
  return (
    <main className="review-page">
      <section className="review-summary">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="review-summary-grid"><div><p className="eyebrow">Profile review · Illustrative fixture</p><span className="status-tag status-published"><Check size={13} /> Passed and published</span><h1>Your case is clear enough to enter discovery.</h1><p>This review assessed published revision 3. It identifies the evidence that worked and the sections most worth strengthening next.</p></div><div className="review-score"><strong>{displayScore}</strong><span>content points / 90</span><small>Publication gate: 50</small></div></div>
      </section>
      <section className="review-layout">
        <div className="review-categories">
          <div className="review-heading"><div><p className="eyebrow">Category evidence</p><h2>What the review found</h2></div><p>Scores use a fixed 0–4 rating per category. The server calculates weighted points; the model never sets the total.</p></div>
          {reviewCategories.map((category) => {
            const section = category.label === "Market" || category.label === "Traction" ? "market" : category.label === "Team" ? "team" : category.label === "Business model" || category.label === "Competition" ? "business" : "problem";
            return <article className="review-category" key={category.label}><div className="review-category-score"><span>{category.label}</span><strong>{category.score}<small>/{category.max}</small></strong></div><div className="review-category-bar"><i style={{ width: `${(category.score / category.max) * 100}%` }} /></div><div className="review-category-note"><span className={category.state === "Strong" ? "review-state strong" : "review-state"}>{category.state}</span><p>{category.note}</p></div><Link href={`/founder/profile/edit#${section}`}>Edit section <ArrowRight size={14} /></Link></article>;
          })}
        </div>
        <aside className="review-sidebar">
          <div><p className="eyebrow">Priority improvements</p><ol><li><span>01</span><div><strong>Show the market assumptions</strong><p>Connect the reachable-household figure to named employer groups and adoption assumptions.</p></div></li><li><span>02</span><div><strong>Make pilot evidence dated</strong><p>State when each letter was signed and what the partner committed to test.</p></div></li><li><span>03</span><div><strong>Name direct alternatives</strong><p>Compare against two services investors are likely to know.</p></div></li></ol><Link className="button button-dark" href="/founder/profile/edit"><FilePenLine size={16} /> Improve the draft</Link></div>
          <div className="score-rule-card"><ShieldCheck size={19} /><h3>How publication works</h3><p>Your exact score is {contentScore}. Profiles publish at 50 or above. The displayed {displayScore} is rounded only for presentation.</p></div>
          <div className="score-rule-card"><CircleAlert size={19} /><h3>What this does not verify</h3><p>The review checks pitch readiness. It does not verify business claims, predict returns, or guarantee investor interest.</p></div>
          <p className="review-version"><Info size={13} /> Rubric v1 · Profile revision 3 · 24 Sep 2026</p>
        </aside>
      </section>
    </main>
  );
}
