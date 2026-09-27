"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Check, CircleAlert, CircleHelp, Eye, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import type { FounderWorkspace } from "@/lib/founder-profile";
import { founderSectors, minorToMajor, type FounderDraft } from "@/lib/profile";
import { initialProfileActionState, saveFounderProfile, type ProfileActionState } from "./actions";

const sections = [
  ["basics", "Basics"], ["problem", "Problem & solution"], ["market", "Market & traction"],
  ["team", "Team"], ["business", "Business & competition"], ["ask", "The ask"],
] as const;

const sectorLabels: Record<(typeof founderSectors)[number], string> = {
  agritech: "Agritech", "climate-energy": "Climate & energy", commerce: "Commerce", education: "Education",
  fintech: "Fintech", healthtech: "Healthtech", logistics: "Logistics", "enterprise-software": "Enterprise software",
  consumer: "Consumer", other: "Other",
};

const countries = [
  ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"], ["ZA", "South Africa"],
  ["UG", "Uganda"], ["RW", "Rwanda"], ["TZ", "Tanzania"], ["EG", "Egypt"],
  ["GB", "United Kingdom"], ["US", "United States"],
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

function FieldError({ error, id }: { error?: string; id: string }) {
  return error ? <span className="field-error" id={id}><CircleAlert size={13} />{error}</span> : null;
}

function errorFor(errors: Record<string, string> | undefined, ...keys: string[]) {
  return keys.map((key) => errors?.[key]).find(Boolean);
}

function TractionFields({ draft, stage, errors }: { draft: FounderDraft; stage: FounderDraft["stage"]; errors?: Record<string, string> }) {
  return (
    <>
      <label>Evidence note<textarea name="traction.evidence_note" rows={5} defaultValue={draft.traction.evidence_note} maxLength={1500} /><small>Describe what happened, when, and what the evidence actually supports.</small></label>
      {stage === "idea" ? <div className="form-grid three-col">
        <label>Customer interviews<input name="traction.interview_count" type="number" min="0" defaultValue={draft.traction.interview_count} /></label>
        <label>Waitlist<input name="traction.waitlist_count" type="number" min="0" defaultValue={draft.traction.waitlist_count} /></label>
        <label>Letters of intent<input name="traction.loi_count" type="number" min="0" defaultValue={draft.traction.loi_count} /></label>
      </div> : null}
      {stage === "pre-seed" ? <div className="form-grid two-col">
        <label>Active users<input name="traction.active_user_count" type="number" min="0" defaultValue={draft.traction.active_user_count} /></label>
        <label>Pilots<input name="traction.pilot_count" type="number" min="0" defaultValue={draft.traction.pilot_count} /></label>
        <label>Monthly revenue <small>Minor units</small><input name="traction.monthly_revenue_minor" inputMode="numeric" defaultValue={draft.traction.monthly_revenue_minor} /></label>
        <label>Revenue currency<select name="traction.revenue_currency" defaultValue={draft.traction.revenue_currency ?? ""}><option value="">Not reported</option><option>NGN</option><option>USD</option></select></label>
      </div> : null}
      {stage === "seed" || stage === "growth" ? <div className="form-grid two-col">
        <label>MRR <small>Minor units</small><input name="traction.mrr_minor" inputMode="numeric" defaultValue={draft.traction.mrr_minor} /></label>
        <label>ARR <small>Minor units</small><input name="traction.arr_minor" inputMode="numeric" defaultValue={draft.traction.arr_minor} /></label>
        <label>Revenue currency<select name="traction.revenue_currency" defaultValue={draft.traction.revenue_currency ?? ""}><option value="">Not reported</option><option>NGN</option><option>USD</option></select></label>
        <label>Measurement period<input name="traction.measurement_period" defaultValue={draft.traction.measurement_period} maxLength={80} placeholder="e.g. Last 6 months" /></label>
        <label>Growth %<input name="traction.growth_pct" type="number" min="-100" max="10000" step="0.1" defaultValue={draft.traction.growth_pct} /></label>
        <label>Retention %<input name="traction.retention_pct" type="number" min="0" max="100" step="0.1" defaultValue={draft.traction.retention_pct} /></label>
      </div> : null}
      <FieldError id="traction-error" error={errorFor(errors, "traction.evidence_note", "traction.interview_count", "traction.active_user_count", "traction.mrr_minor")} />
    </>
  );
}

export function ProfileEditor({ workspace }: { workspace: FounderWorkspace }) {
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(async (previousState: ProfileActionState, formData: FormData) => {
    const nextState = await saveFounderProfile(previousState, formData);
    if (nextState.draftVersion !== undefined) setDirty(false);
    return nextState;
  }, initialProfileActionState);
  const version = state.draftVersion ?? workspace.draftVersion;
  const [stage, setStage] = useState(workspace.draft.stage);
  const [sector, setSector] = useState(workspace.draft.sector);
  const [team, setTeam] = useState(() => workspace.draft.team.map((member, index) => ({ key: `initial-${index}`, member })));

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const markDirty = () => setDirty(true);
  const changeStage = (nextStage: FounderDraft["stage"]) => {
    if (nextStage !== stage && dirty && !window.confirm("Changing stage changes which traction evidence is collected. Continue and review this section before saving?")) return;
    setStage(nextStage);
    markDirty();
  };
  const errors = state.fieldErrors;

  return (
    <main className="editor-page">
      <section className="editor-topbar">
        <div><p className="editor-context">Founder profile · Draft version {version || "new"}</p><h1>Make the case in your own words.</h1><p>Save a private draft at any time. Investors only see a reviewed revision after it is published.</p></div>
        <div className="editor-top-actions"><span className={dirty ? "save-state dirty" : "save-state"}>{dirty ? "● Unsaved changes" : <><Check size={13} /> {state.message}</>}</span><Link className="button button-light" href="/founder/profile/preview"><Eye size={16} /> Preview</Link></div>
      </section>

      {workspace.loadError ? <div className="persistent-error editor-system-state" role="alert"><CircleAlert size={18} /><div><strong>The saved draft could not be loaded.</strong><p>Reload before entering information. If this is a new environment, apply the latest Supabase migration first.</p></div></div> : null}
      {state.status === "conflict" || state.status === "error" ? <div className="persistent-error editor-system-state" role="alert"><CircleAlert size={18} /><div><strong>{state.status === "conflict" ? "This draft changed elsewhere." : "The profile needs attention."}</strong><p>{state.message}</p></div></div> : null}
      {errors && Object.keys(errors).length ? <div className="validation-summary" role="alert"><strong>Review {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? "" : "s"} before continuing.</strong><ul>{Object.values(errors).map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {(state.status === "reviewing" || state.status === "review_ready") && state.reviewId ? <div className="submission-banner" role="status"><ShieldCheck size={19} /><div><strong>{state.status === "review_ready" ? "Review complete." : "Revision secured for review."}</strong><p>{state.message}</p></div><Link href={`/founder/reviews/${state.reviewId}`}>{state.status === "review_ready" ? "Open review" : "Open review status"}</Link></div> : null}

      <div className="editor-layout">
        <aside className="editor-nav"><p>Profile sections</p>{sections.map(([id, label], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}<hr /><div><strong>Publication gate</strong><span>Submit fields complete</span><span>Content score must reach 50/90</span></div></aside>
        <form action={formAction} className="profile-form" onChange={markDirty}>
          <input name="expected_version" type="hidden" value={version} readOnly />
          <fieldset disabled={workspace.loadError || pending}>
            <section id="basics" className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Basics</h2><p>The five fields required for the first private save.</p></div></div><div className="form-grid two-col">
              <label>Startup name <em>Required</em><input aria-describedby="name-error" name="name" defaultValue={workspace.draft.name} required minLength={2} maxLength={80} /><FieldError id="name-error" error={errors?.name} /></label>
              <label>Stage <em>Required</em><select name="stage" value={stage} onChange={(event) => changeStage(event.target.value as FounderDraft["stage"])} required><option value="idea">Idea</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="growth">Growth</option></select></label>
              <label className="full-field">One-line tagline <em>Required</em><input aria-describedby="tagline-error" name="tagline" defaultValue={workspace.draft.tagline} required minLength={10} maxLength={180} /><small>Say who benefits, what changes, and how.</small><FieldError id="tagline-error" error={errors?.tagline} /></label>
              <label>Sector <em>Required</em><select name="sector" value={sector} onChange={(event) => { setSector(event.target.value as FounderDraft["sector"]); markDirty(); }}>{founderSectors.map((value) => <option key={value} value={value}>{sectorLabels[value]}</option>)}</select></label>
              {sector === "other" ? <label>Describe the sector <em>Required</em><input name="other_sector" defaultValue={workspace.draft.other_sector} minLength={2} maxLength={60} required /><FieldError id="other-sector-error" error={errors?.other_sector} /></label> : <input name="other_sector" type="hidden" value="" />}
              <label>Country <em>Required</em><select name="country" defaultValue={workspace.draft.country} required>{countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><FieldError id="country-error" error={errors?.country} /></label>
              <label>City<input name="city" defaultValue={workspace.draft.city} maxLength={80} /></label>
            </div></section>

            <section id="problem" className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Problem & solution</h2><p>Required for review, not for a private draft.</p></div></div>
              <label>Problem statement <em>Required for review</em><textarea aria-describedby="problem-help problem-error" name="problem" rows={5} defaultValue={workspace.draft.problem} maxLength={2000} /><small id="problem-help">Name the person, the costly or frustrating moment, and what happens today.</small><FieldError id="problem-error" error={errors?.problem} /></label>
              <label>Solution <em>Required for review</em><textarea aria-describedby="solution-error" name="solution" rows={5} defaultValue={workspace.draft.solution} maxLength={2000} /><FieldError id="solution-error" error={errors?.solution} /></label>
            </section>

            <section id="market" className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Market & traction</h2><p>Use assumptions and evidence appropriate to {stage === "pre-seed" ? "pre-seed" : stage}.</p></div></div>
              <div className="term-row"><GlossaryTerm term="TAM" /><GlossaryTerm term="SAM" /><GlossaryTerm term="SOM" /></div>
              <div className="form-grid two-col"><label>Market currency<select name="market.currency" defaultValue={workspace.draft.market.currency ?? ""}><option value="">Not reported</option><option>NGN</option><option>USD</option></select></label><span />
                <label>TAM<input name="market.tam" inputMode="decimal" defaultValue={minorToMajor(workspace.draft.market.tam_minor)} placeholder="e.g. 420000000" /></label>
                <label>SAM<input name="market.sam" inputMode="decimal" defaultValue={minorToMajor(workspace.draft.market.sam_minor)} /></label>
                <label>SOM<input name="market.som" inputMode="decimal" defaultValue={minorToMajor(workspace.draft.market.som_minor)} /></label>
              </div>
              <label>Market explanation<textarea name="market.explanation" rows={5} defaultValue={workspace.draft.market.explanation} maxLength={1500} /><small>Show the assumptions and reachable segment. A large number alone is not evidence.</small><FieldError id="market-error" error={errorFor(errors, "market.currency", "market.tam_minor", "market.sam_minor", "market.som_minor", "market.explanation")} /></label>
              <div className="form-grid two-col"><label>Source label<input name="source.0.label" defaultValue={workspace.draft.market.sources[0]?.label ?? ""} maxLength={120} /></label><label>Source URL<input name="source.0.url" type="url" defaultValue={workspace.draft.market.sources[0]?.url ?? ""} placeholder="https://" /></label></div>
              <h3 className="form-subheading">Stage evidence</h3><TractionFields draft={workspace.draft} stage={stage} errors={errors} />
            </section>

            <section id="team" className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Team</h2><p>Add up to five people and connect their experience to this problem.</p></div></div>
              <div className="team-editor">{team.map(({ key, member }, index) => <div className="team-member" key={key}><div className="team-member-heading"><strong>Team member {index + 1}</strong>{team.length > 1 ? <button type="button" onClick={() => { setTeam((current) => current.filter((item) => item.key !== key)); markDirty(); }}><Trash2 size={14} /> Remove</button> : null}</div><div className="form-grid two-col"><label>Name <em>Required for review</em><input name={`team.${index}.name`} defaultValue={member.name} maxLength={80} /><FieldError id={`team-${index}-name-error`} error={errors?.[`team.${index}.name`]} /></label><label>Role <em>Required for review</em><input name={`team.${index}.role`} defaultValue={member.role} maxLength={80} /><FieldError id={`team-${index}-role-error`} error={errors?.[`team.${index}.role`]} /></label><label className="full-field">Relevant experience <em>Required for review</em><textarea name={`team.${index}.relevant_experience`} rows={4} defaultValue={member.relevant_experience} maxLength={400} /><FieldError id={`team-${index}-experience-error`} error={errors?.[`team.${index}.relevant_experience`]} /></label></div></div>)}</div>
              {team.length < 5 ? <button className="text-action add-team" type="button" onClick={() => { setTeam((current) => [...current, { key: `new-${Date.now()}`, member: { name: "", role: "", relevant_experience: "" } }]); markDirty(); }}><Plus size={15} /> Add team member</button> : null}
              <FieldError id="team-error" error={errors?.team} />
            </section>

            <section id="business" className="form-section"><div className="form-section-heading"><span>05</span><div><h2>Business & competition</h2><p>Explain the payer, exchange of value, and credible alternatives.</p></div></div>
              <label>Business model<textarea name="business_model" rows={5} defaultValue={workspace.draft.business_model} maxLength={1500} /></label>
              <label>Competition and differentiation<textarea name="competition" rows={5} defaultValue={workspace.draft.competition} maxLength={1500} /></label>
            </section>

            <section id="ask" className="form-section"><div className="form-section-heading"><span>06</span><div><h2>The ask</h2><p>State the amount, currency, and milestone this round unlocks.</p></div></div><div className="form-grid two-col">
              <label>Amount raising <em>Required for review</em><input aria-describedby="ask-error" name="ask_amount" inputMode="decimal" defaultValue={minorToMajor(workspace.draft.ask_amount_minor)} placeholder="e.g. 250000" /><FieldError id="ask-error" error={errors?.ask_amount_minor} /></label>
              <label>Currency<select name="ask_currency" defaultValue={workspace.draft.ask_currency}><option>USD</option><option>NGN</option></select></label>
              <label className="full-field">Use of funds <em>Required for review</em><textarea aria-describedby="use-of-funds-error" name="use_of_funds" rows={4} defaultValue={workspace.draft.use_of_funds} maxLength={1000} /><FieldError id="use-of-funds-error" error={errors?.use_of_funds} /></label>
            </div></section>

            <div className="form-actions"><div><strong>{pending ? "Saving this revision…" : "Ready when the case is specific."}</strong><span>Review assesses the writing against the fixed rubric; it never rewrites your answers.</span></div><button className="button button-light" type="submit" name="intent" value="save" formNoValidate disabled={pending}><Save size={16} /> {pending ? "Saving…" : "Save draft"}</button><button className="button button-dark" type="submit" name="intent" value="review" disabled={pending}><Send size={16} /> {pending ? "Submitting…" : "Submit for review"}</button></div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
