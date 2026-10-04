"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, CircleAlert, CircleHelp, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useFormRecovery } from "@/hooks/use-form-recovery";
import { investorCountries, investorTypeLabels, investorTypes, sectorLabels, stageLabels } from "@/lib/investor-profile";
import { founderSectors, founderStages, majorToMinor, minorToMajor } from "@/lib/profile";
import type { Database } from "@/lib/supabase/database.types";
import styles from "./profile.module.css";

type ProfileRow = Database["public"]["Tables"]["investor_profiles"]["Row"];
type SaveState = "idle" | "saving" | "saved" | "error";

function ErrorText({ error, id }: { error?: string; id: string }) {
  return error ? <small className={styles.error} id={id}><CircleAlert size={13} />{error}</small> : null;
}

export function InvestorProfileForm({ accountName, profile }: { accountName: string; profile: ProfileRow | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [anywhere, setAnywhere] = useState(!profile || profile.countries.length === 0);
  const { clearRecovery, recoveredAt } = useFormRecovery({
    formRef,
    storageKey: "pitch-deck:investor-profile",
    onRecover: (values) => setAnywhere(values.country_anywhere !== ""),
  });

  const markDirty = () => {
    if (saveState === "saved" || saveState === "error") {
      setSaveState("idle");
      setMessage("");
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaveState("saving");
    setErrors({});
    setMessage("");

    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      investor_type: String(data.get("investor_type") ?? ""),
      firm_name: String(data.get("firm_name") ?? ""),
      professional_title: String(data.get("professional_title") ?? ""),
      bio: String(data.get("bio") ?? ""),
      sectors: founderSectors.filter((sector) => data.get(`sector.${sector}`) === "on"),
      stages: founderStages.filter((stage) => data.get(`stage.${stage}`) === "on"),
      countries: anywhere ? [] : investorCountries.map(([code]) => code).filter((code) => data.get(`country.${code}`) === "on"),
      check_currency: String(data.get("check_currency") ?? ""),
      check_min_minor: majorToMinor(String(data.get("check_min") ?? "")),
      check_max_minor: majorToMinor(String(data.get("check_max") ?? "")),
      linkedin_url: String(data.get("linkedin_url") ?? ""),
    };

    try {
      const response = await fetch("/api/v1/investor-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        const fieldErrors = result.error?.field_errors ?? {};
        setErrors(fieldErrors);
        setMessage(result.error?.message ?? "Your profile was not saved. Try again.");
        setSaveState("error");
        const first = Object.keys(fieldErrors)[0];
        const targetName = first === "sectors" ? `sector.${founderSectors[0]}` : first === "stages" ? `stage.${founderStages[0]}` : first;
        window.setTimeout(() => (form.elements.namedItem(targetName) as HTMLElement | null)?.focus(), 0);
        return;
      }
      clearRecovery();
      setSaveState("saved");
      setMessage("Your investment profile is saved. Discovery is ready with these preferences.");
    } catch {
      setSaveState("error");
      setMessage("The connection dropped before we could confirm the save. Your browser copy is safe; try again.");
    }
  }

  const savedSectors = new Set(profile?.sectors ?? ["healthtech", "fintech"]);
  const savedStages = new Set(profile?.stages ?? ["pre-seed", "seed"]);
  const savedCountries = new Set(profile?.countries ?? []);
  const buttonLabel = saveState === "saving" ? "Saving profile…" : saveState === "saved" ? "Profile saved" : "Save investment profile";

  return (
    <form className={styles.form} onSubmit={submit} onChange={markDirty} onInput={markDirty} noValidate ref={formRef}>
      <div className={styles.formGrid}>
        <aside className={styles.summary}>
          <div className={styles.initials}>{(profile?.full_name || accountName).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <h2>{profile ? "Profile in use" : "Complete your investment profile"}</h2>
          <p>Founders will only see a safe professional summary after an introduction starts.</p>
          <dl>
            <div><dt>Profile visibility</dt><dd>Private</dd></div>
            <div><dt>Email domain check</dt><dd>{profile?.domain_signal ? "Firm email matched" : "Unverified"}</dd></div>
          </dl>
          <details><summary><CircleHelp size={15} /> What “Unverified” means</summary><p>An empty operator allowlist is valid. We do not treat a business email, Gmail address, or LinkedIn link as proof of identity or funds.</p></details>
        </aside>

        <div className={styles.fields}>
          <section className={styles.section} aria-labelledby="identity-heading">
            <div className={styles.sectionHeading}><h2 id="identity-heading">Your investing identity</h2><p>The minimum founders need to understand who is reaching out.</p></div>
            <div className={styles.twoColumns}>
              <label><span>Full name <em>Required</em></span><input name="full_name" defaultValue={profile?.full_name ?? accountName} maxLength={80} autoComplete="name" aria-describedby={errors.full_name ? "full-name-error" : undefined} /><ErrorText id="full-name-error" error={errors.full_name} /></label>
              <label><span>Investor type <em>Required</em></span><select name="investor_type" defaultValue={profile?.investor_type ?? "angel"}>{investorTypes.map((type) => <option value={type} key={type}>{investorTypeLabels[type]}</option>)}</select><ErrorText id="investor-type-error" error={errors.investor_type} /></label>
              <label><span>Firm or organisation</span><input name="firm_name" defaultValue={profile?.firm_name ?? ""} maxLength={120} autoComplete="organization" placeholder="Optional for angel investors" /><ErrorText id="firm-name-error" error={errors.firm_name} /></label>
              <label><span>Professional title</span><input name="professional_title" defaultValue={profile?.professional_title ?? ""} maxLength={100} autoComplete="organization-title" placeholder="Partner, angel investor, programme lead…" /><ErrorText id="title-error" error={errors.professional_title} /></label>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="thesis-heading">
            <div className={styles.sectionHeading}><h2 id="thesis-heading">Investment thesis</h2><p>Choose the areas you genuinely review. Broad preferences make discovery less useful.</p></div>
            <fieldset><legend>Sectors <em>Choose 1–5</em></legend><div className={styles.choiceGrid}>{founderSectors.map((sector) => <label className={styles.choice} key={sector}><input type="checkbox" name={`sector.${sector}`} defaultChecked={savedSectors.has(sector)} /><span>{sectorLabels[sector]}</span></label>)}</div><ErrorText id="sectors-error" error={errors.sectors} /></fieldset>
            <fieldset><legend>Stages <em>Choose at least one</em></legend><div className={styles.choiceGrid}>{founderStages.map((stage) => <label className={styles.choice} key={stage}><input type="checkbox" name={`stage.${stage}`} defaultChecked={savedStages.has(stage)} /><span>{stageLabels[stage]}</span></label>)}</div><ErrorText id="stages-error" error={errors.stages} /></fieldset>
            <fieldset><legend>Geography <em>Up to 10 countries</em></legend><label className={`${styles.choice} ${styles.anywhere}`}><input type="checkbox" name="country_anywhere" checked={anywhere} onChange={(event) => setAnywhere(event.target.checked)} /><span>Anywhere</span><small>No country restriction</small></label><div className={styles.choiceGrid}>{investorCountries.map(([code, label]) => <label className={styles.choice} key={code}><input type="checkbox" name={`country.${code}`} defaultChecked={savedCountries.has(code)} disabled={anywhere} /><span>{label}</span></label>)}</div><ErrorText id="countries-error" error={errors.countries} /></fieldset>
          </section>

          <section className={styles.section} aria-labelledby="cheque-heading">
            <div className={styles.sectionHeading}><h2 id="cheque-heading">Typical cheque size</h2><p>The amount your organisation can usually contribute—not the full round a startup must be raising.</p></div>
            <div className={styles.moneyGrid}>
              <label><span>Currency</span><select name="check_currency" defaultValue={profile?.check_currency ?? "USD"}><option value="USD">USD</option><option value="NGN">NGN</option></select></label>
              <label><span>Minimum cheque</span><input name="check_min" inputMode="decimal" defaultValue={profile ? minorToMajor(String(profile.check_min_minor)) : "10000"} placeholder="10,000" /><ErrorText id="check-min-error" error={errors.check_min_minor} /></label>
              <label><span>Maximum cheque</span><input name="check_max" inputMode="decimal" defaultValue={profile ? minorToMajor(String(profile.check_max_minor)) : "100000"} placeholder="100,000" /><ErrorText id="check-max-error" error={errors.check_max_minor} /></label>
            </div>
          </section>

          <details className={styles.optional} open={Boolean(profile?.bio || profile?.linkedin_url)}>
            <summary>Optional professional context <span>Bio and LinkedIn</span></summary>
            <div className={styles.optionalFields}>
              <label><span>Short bio</span><textarea name="bio" defaultValue={profile?.bio ?? ""} maxLength={600} rows={5} placeholder="Your investment focus and relevant experience, in your own words." /><small>Up to 600 characters. This may appear only inside an active introduction.</small><ErrorText id="bio-error" error={errors.bio} /></label>
              <label><span>LinkedIn profile or company page</span><input name="linkedin_url" type="url" defaultValue={profile?.linkedin_url ?? ""} maxLength={2048} placeholder="https://www.linkedin.com/in/…" /><small>Self-reported. A link is not an identity-verification badge.</small><ErrorText id="linkedin-error" error={errors.linkedin_url} /></label>
            </div>
          </details>
        </div>
      </div>

      <div className={styles.actionBar}>
        <div aria-live="polite">
          {recoveredAt && saveState === "idle" ? <span><ShieldCheck size={15} /> Unfinished changes recovered from this browser.</span> : null}
          {message ? <span className={saveState === "error" ? styles.failure : styles.success}>{saveState === "error" ? <CircleAlert size={15} /> : <Check size={15} />}{message}</span> : <small>Save before opening discovery on another device.</small>}
        </div>
        <button className="button button-dark" type="submit" disabled={saveState === "saving" || saveState === "saved"}>{saveState === "saving" ? <LoaderCircle className={styles.spinner} size={16} /> : saveState === "saved" ? <Check size={16} /> : <Save size={16} />}{buttonLabel}</button>
      </div>
    </form>
  );
}
