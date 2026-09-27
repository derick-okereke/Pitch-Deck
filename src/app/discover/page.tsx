"use client";

import { useMemo, useState } from "react";
import { LockKeyhole, Search, SlidersHorizontal, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartupCard } from "@/components/startup-card";
import { startups } from "@/data/startups";

const sectors = ["All sectors", "Healthtech", "Fintech", "Agritech", "Logistics", "Education", "Climate & energy"];
const stages = ["All stages", "Idea", "Pre-seed", "Seed", "Growth"];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const matches = useMemo(() => startups.filter((startup) => {
    const text = `${startup.name} ${startup.tagline} ${startup.location}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (sector === "All sectors" || startup.sector === sector) && (stage === "All stages" || startup.stage === stage);
  }), [query, sector, stage]);
  const clear = () => { setQuery(""); setSector("All sectors"); setStage("All stages"); };

  return (
    <div className="page-canvas"><div className="page-shell">
      <section className="app-panel">
        <SiteHeader />
        <div className="directory-intro">
          <div><p className="eyebrow">Investor discovery</p><h1>Find the founders<br />who did the preparation.</h1></div>
          <p>Search synthetic demo profiles by business fit, then inspect the evidence behind each readiness signal before requesting an introduction.</p>
        </div>
        <div className="filter-bar">
          <label className="search-field"><Search size={18} /><span className="sr-only">Search startups</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by company, thesis, or location" /></label>
          <label><span>Sector</span><select value={sector} onChange={(event) => setSector(event.target.value)}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Stage</span><select value={stage} onChange={(event) => setStage(event.target.value)}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="button button-light filters-button" type="button"><SlidersHorizontal size={17} /> More filters <LockKeyhole size={13} /></button>
        </div>
        <div className="pro-filter-note"><LockKeyhole size={14} /><span><strong>Investor Pro</strong> adds ask range, country, readiness threshold, and saved searches.</span><button type="button">Preview Pro filters</button></div>
      </section>

      <main className="directory-layout">
        <aside className="directory-rail">
          <p className="rail-label">Discovery index</p><strong>{matches.length.toString().padStart(2, "0")}</strong><span>matching profiles</span><hr />
          <p>Ordered by readiness signal, then most recently reviewed.</p>
          <div className="legend"><span><i className="amber-dot" /> Earned badge</span><span><i className="grey-dot" /> Content reviewed</span></div>
        </aside>
        <section className="results-list" aria-live="polite">
          <div className="results-heading"><div><p className="eyebrow">Curated results</p><h2>{matches.length === 1 ? "1 startup" : `${matches.length} startups`}</h2></div>{(query || sector !== "All sectors" || stage !== "All stages") && <button type="button" onClick={clear}><X size={15} /> Clear filters</button>}</div>
          {matches.length > 0 ? matches.map((startup) => <StartupCard startup={startup} key={startup.slug} />) : (
            <div className="empty-state"><span>00</span><h2>No profiles match this combination.</h2><p>Try a broader sector or stage. Readiness filters should narrow a useful set, not leave you guessing.</p><button className="button button-dark" onClick={clear}>Reset filters</button></div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div></div>
  );
}
