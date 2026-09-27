"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, CircleHelp, Eye, Save, Send, ShieldCheck } from "lucide-react";
import { founderProfile } from "@/data/founder-demo";

const sections = [
  ["basics", "Basics"], ["problem", "Problem & solution"], ["market", "Market & traction"],
  ["team", "Team"], ["business", "Business & competition"], ["ask", "The ask"],
] as const;

const glossary: Record<string, string> = {
  TAM: "The total annual demand if every possible customer used this type of solution.",
  SAM: "The part of that total market your current product and geography can serve.",
  SOM: "The realistic share you can reach in the near term with your current plan.",
};

function GlossaryTerm({ term }: { term: keyof typeof glossary }) {
  const [open, setOpen] = useState(false);
  return <span className="glossary-term"><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{term}<CircleHelp size={14} /></button>{open && <span role="tooltip">{glossary[term]}</span>}</span>;
}

export default function ProfileEditor() {
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("All changes saved");
  const [submitReady, setSubmitReady] = useState(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = () => { setDirty(true); setMessage("Unsaved changes"); setSubmitReady(false); };
  const save = () => { setDirty(false); setMessage("Draft saved just now"); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setDirty(false); setMessage("Draft saved · ready for review"); setSubmitReady(true);
  };

  return (
    <main className="editor-page">
      <section className="editor-topbar">
        <div><p className="eyebrow">Founder profile · Draft revision 4</p><h1>Make the case in your own words.</h1><p>Investors will only see this revision after it passes review and you choose to publish it.</p></div>
        <div className="editor-top-actions"><span className={dirty ? "save-state dirty" : "save-state"}>{dirty ? "●" : <Check size={13} />} {message}</span><Link className="button button-light" href="/founder/profile/preview"><Eye size={16} /> Preview</Link></div>
      </section>
      {submitReady && <div className="submission-banner" role="status"><ShieldCheck size={19} /><div><strong>This demo draft is ready for review.</strong><p>Provider scoring is connected in a later phase. The review page currently uses a clearly labelled fixture.</p></div><Link href="/founder/reviews/demo-review">Open demo review <ArrowRight size={15} /></Link></div>}
      <div className="editor-layout">
        <aside className="editor-nav"><p>Profile sections</p>{sections.map(([id, label], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}<hr /><div><strong>Publication gate</strong><span>Required fields complete</span><span>Latest content score: 64.5</span></div></aside>
        <form className="profile-form" onSubmit={submit} onChange={edit}>
          <section id="basics" className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Basics</h2><p>Enough information to save a private draft.</p></div></div><div className="form-grid two-col"><label>Startup name <em>Required</em><input name="name" defaultValue={founderProfile.name} required maxLength={100} /></label><label>Stage <em>Required</em><select name="stage" defaultValue="pre-seed" required><option>idea</option><option>pre-seed</option><option>seed</option><option>growth</option></select></label><label className="full-field">One-line tagline <em>Required</em><input name="tagline" defaultValue={founderProfile.tagline} required maxLength={160} /><small>One sentence. Say who benefits and what becomes easier.</small></label><label>Sector <em>Required</em><select name="sector" defaultValue="healthtech"><option value="healthtech">Healthtech</option><option value="fintech">Fintech</option><option value="agritech">Agritech</option></select></label><label>Country <em>Required</em><input name="country" defaultValue={founderProfile.country} required /></label></div></section>
          <section id="problem" className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Problem & solution</h2><p>Specific language gives the review something real to assess.</p></div></div><label>Problem statement <em>Required to publish</em><textarea name="problem" rows={5} defaultValue={founderProfile.problem} required maxLength={2000} /><small>Example: name the person, the costly or frustrating moment, and what happens today.</small></label><label>Solution <em>Required to publish</em><textarea name="solution" rows={5} defaultValue={founderProfile.solution} required maxLength={2000} /></label></section>
          <section id="market" className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Market & traction</h2><p>Use evidence appropriate to your stage; pre-revenue is not a penalty.</p></div></div><label>Market size <span className="term-row"><GlossaryTerm term="TAM" /><GlossaryTerm term="SAM" /><GlossaryTerm term="SOM" /></span><textarea name="market" rows={5} defaultValue={founderProfile.market} maxLength={2000} /><small>Show the source or assumption behind each number. A large number without a path to reach it is not enough.</small></label><label>Pre-seed traction<textarea name="traction" rows={5} defaultValue={founderProfile.traction} maxLength={2000} /><small>Useful evidence includes interviews, letters of intent, pilots, early users, and revenue.</small></label></section>
          <section id="team" className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Team</h2><p>Connect experience to this problem instead of listing résumés.</p></div></div><label>Founder and team credibility <em>Required to publish</em><textarea name="team" rows={5} defaultValue={founderProfile.team} required maxLength={2000} /></label></section>
          <section id="business" className="form-section"><div className="form-section-heading"><span>05</span><div><h2>Business & competition</h2><p>Explain the payer, exchange of value, and the alternatives.</p></div></div><label>Business model<textarea name="businessModel" rows={5} defaultValue={founderProfile.businessModel} maxLength={2000} /></label><label>Competition and differentiation<textarea name="competition" rows={5} defaultValue={founderProfile.competition} maxLength={2000} /></label></section>
          <section id="ask" className="form-section"><div className="form-section-heading"><span>06</span><div><h2>The ask</h2><p>State the amount, currency, and what this round unlocks.</p></div></div><div className="form-grid two-col"><label>Amount raising <em>Required</em><input name="ask" defaultValue={founderProfile.ask} required /></label><label>Currency <em>Required</em><select name="currency" defaultValue="USD"><option>USD</option><option>NGN</option></select></label><label className="full-field">Use of funds <em>Required to publish</em><textarea name="useOfFunds" rows={4} defaultValue={founderProfile.useOfFunds} required maxLength={2000} /></label></div></section>
          <div className="form-actions"><div><strong>Ready when the case is specific.</strong><span>Review checks the writing against the fixed rubric; it does not rewrite it for you.</span></div><button className="button button-light" type="button" onClick={save}><Save size={16} /> Save draft</button><button className="button button-dark" type="submit"><Send size={16} /> Submit for review</button></div>
        </form>
      </div>
    </main>
  );
}
