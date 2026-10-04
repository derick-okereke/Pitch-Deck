"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CircleAlert, CircleHelp, Eye, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import type { FounderWorkspace } from "@/lib/founder-profile";
import { founderSectors, minorToMajor, type FounderDraft } from "@/lib/profile";
import { initialProfileActionState, type ProfileActionState } from "@/lib/profile-action-state";
import { useFormRecovery } from "@/hooks/use-form-recovery";

const sections = [
  ["basics", "Basics"], ["problem", "Problem & solution"], ["market", "Market & traction"],
  ["team", "Team"], ["business", "Business & competition"], ["ask", "The ask"],
] as const;

const stageChoices = [
  { value: "idea", label: "Idea", explanation: "shaping a concept before building a product" },
  { value: "pre-seed", label: "Pre-seed", explanation: "building and testing an early version" },
  { value: "seed", label: "Seed", explanation: "gaining early users and learning how to grow" },
  { value: "growth", label: "Growth", explanation: "expanding a product with steady demand" },
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
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ProfileActionState>(initialProfileActionState);
  const [pending, setPending] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<"save" | "review" | null>(null);
  const version = state.draftVersion ?? workspace.draftVersion;
  const [stage, setStage] = useState(workspace.draft.stage);
  const [sector, setSector] = useState(workspace.draft.sector);
  const [team, setTeam] = useState(() => workspace.draft.team.map((member, index) => ({ key: `initial-${index}`, member })));
  const { clearRecovery, recoveredAt } = useFormRecovery({
    formRef,
    storageKey: `pitch-deck:founder-profile:${workspace.ownerId}`,
    onRecover(values) {
      if (["idea", "pre-seed", "seed", "growth"].includes(values.stage)) setStage(values.stage as FounderDraft["stage"]);
      if (founderSectors.includes(values.sector as FounderDraft["sector"])) setSector(values.sector as FounderDraft["sector"]);
      const indexes = Object.keys(values).flatMap((key) => {
        const match = key.match(/^team\.(\d+)\./u);
        return match ? [Number(match[1])] : [];
      });
      const count = indexes.length ? Math.min(5, Math.max(...indexes) + 1) : 0;
      if (count) setTeam(Array.from({ length: count }, (_, index) => ({
        key: `recovered-${index}`,
        member: {
          name: values[`team.${index}.name`] ?? "",
          role: values[`team.${index}.role`] ?? "",
          relevant_experience: values[`team.${index}.relevant_experience`] ?? "",
        },
      })));
      setDirty(true);
    },
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state.draftVersion === undefined) return;
    clearRecovery();
    const timer = window.setTimeout(() => setDirty(false), 0);
    return () => window.clearTimeout(timer);
  }, [clearRecovery, state.draftVersion]);

  useEffect(() => {
    if (pending || !["error", "conflict", "review_ready"].includes(state.status)) return;
    const timer = window.setTimeout(() => {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pending, state.status]);

  const markDirty = () => setDirty(true);
  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(form);
    const intent = submitter?.value === "review" ? "review" : "save";
    formData.set("intent", intent);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), intent === "review" ? 65_000 : 30_000);
    setPending(true);
    setPendingIntent(intent);
    setState((current) => ({
      ...current,
      status: "idle",
      message: intent === "review" ? "Reviewing this revision…" : "Saving this revision…",
      fieldErrors: undefined,
    }));
    try {
      const response = await fetch("/api/v1/founder/profile", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) throw new Error("PROFILE_SAVE_NON_JSON_RESPONSE");
      const result = await response.json() as ProfileActionState;
      if (!result || typeof result.message !== "string" || typeof result.status !== "string") {
        throw new Error("PROFILE_SAVE_INVALID_RESPONSE");
      }
      setState((current) => ({
        ...result,
        draftVersion: result.draftVersion ?? current.draftVersion,
        startupId: result.startupId ?? current.startupId,
      }));
    } catch {
      setState((current) => ({
        ...current,
        status: "error",
        message: navigator.onLine
          ? "The save service did not respond. Your browser copy is safe; wait a moment and try again."
          : "You appear to be offline. Your browser copy is safe; reconnect and try again.",
        fieldErrors: undefined,
      }));
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
      setPendingIntent(null);
    }
  };
  const changeStage = (nextStage: FounderDraft["stage"]) => {
    if (nextStage !== stage && dirty && !window.confirm("Changing stage changes which traction evidence is collected. Continue and review this section before saving?")) return;
    setStage(nextStage);
    markDirty();
  };
  const errors = state.fieldErrors;
  const draftConfirmed = !dirty && state.draftVersion !== undefined;
  const hasFieldErrors = Boolean(errors && Object.keys(errors).length);
  const hasSubmissionFeedback = state.status === "conflict" || state.status === "error" || state.status === "review_ready" || hasFieldErrors;

  return (
    <main className="editor-page">
      <section className="editor-topbar">
        <div><p className="editor-context">Founder profile · Draft version {version || "new"}</p><h1>Make the case in your own words.</h1><p>Save a private draft at any time. Investors only see a reviewed revision after it is published.</p></div>
        <div className="editor-top-actions"><span className={dirty ? "save-state dirty" : "save-state"}>{dirty ? "● Unsaved changes" : <><Check size={13} /> {draftConfirmed ? "Draft saved" : "All changes saved"}</>}</span><Link className="button button-light" href="/founder/profile/preview"><Eye size={16} /> Preview</Link></div>
      </section>

      {workspace.loadError ? <div className="persistent-error editor-system-state" role="alert"><CircleAlert size={18} /><div><strong>The saved draft could not be loaded.</strong><p>Reload this page before entering information. If your draft still does not load, try again later.</p></div></div> : null}
      {recoveredAt ? <div className="recovery-banner" role="status"><Check size={17} /><div><strong>Unsaved work recovered from this browser.</strong><p>Review it, then save when you are ready. Passwords and uploaded files are never stored this way.</p></div><button type="button" onClick={clearRecovery}>Discard recovery copy</button></div> : null}

      <div className="editor-layout">
        <aside className="editor-nav"><p>Profile sections</p>{sections.map(([id, label], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}<hr /><div><strong>Publication gate</strong><span>Submit fields complete</span><span>At least 50 content points to publish</span><span>Total readiness includes up to 10 Pro delivery points</span></div></aside>
        <form className="profile-form" onChange={markDirty} onSubmit={submitProfile} ref={formRef}>
          <input name="expected_version" type="hidden" value={version} readOnly />
          <fieldset disabled={workspace.loadError || pending}>
            <section id="basics" className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Basics</h2><p>The five fields required for the first private save.</p></div></div><div className="form-grid two-col">
              <label>Startup name <em>Required</em><input aria-describedby="name-error" name="name" defaultValue={workspace.draft.name} required minLength={2} maxLength={80} /><FieldError id="name-error" error={errors?.name} /></label>
              <label>Stage <em>Required</em><select name="stage" value={stage} onChange={(event) => changeStage(event.target.value as FounderDraft["stage"])} required>{stageChoices.map(({ value, label, explanation }) => <option value={value} key={value}>{label} — {explanation}</option>)}</select></label>
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

            {hasSubmissionFeedback ? <div className="form-feedback" ref={feedbackRef} tabIndex={-1}>
              {state.status === "conflict" || (state.status === "error" && !hasFieldErrors) ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>{state.status === "conflict" ? "This draft changed elsewhere." : "The profile needs attention."}</strong><p>{state.message}</p></div></div> : null}
              {errors && Object.keys(errors).length ? <div className="validation-summary" role="alert"><strong>Review {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? "" : "s"} before continuing.</strong><ul>{Object.values(errors).map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
              {state.status === "review_ready" && state.reviewId ? <div className="submission-banner" role="status"><ShieldCheck size={19} /><div><strong>Review complete.</strong><p>{state.message}</p></div><Link href={`/founder/reviews/${state.reviewId}`}>Open review</Link></div> : null}
            </div> : null}

            <div className="form-actions"><div><strong>{pending ? (pendingIntent === "review" ? "Reviewing this revision…" : "Saving this revision…") : "Ready when the case is specific."}</strong><span>Review assesses the writing against the fixed rubric; it never rewrites your answers.</span></div><button className="button button-light" type="submit" name="intent" value="save" formNoValidate disabled={pending}>{draftConfirmed ? <Check size={16} /> : <Save size={16} />} {pendingIntent === "save" ? "Saving…" : draftConfirmed ? "Draft saved" : "Save draft"}</button><button className="button button-dark" type="submit" name="intent" value="review" formNoValidate disabled={pending}><Send size={16} /> {pendingIntent === "review" ? "Submitting…" : "Submit for review"}</button></div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
