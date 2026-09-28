"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, CircleAlert, LockKeyhole, Search, SlidersHorizontal, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartupCard } from "@/components/startup-card";
import { investorCountries, sectorLabels, stageLabels } from "@/lib/investor-profile";
import { hasProDiscoveryFilters, type DiscoveryFilters, type DiscoveryResult } from "@/lib/marketplace";
import { founderSectors, founderStages } from "@/lib/profile";

function href(filters: DiscoveryFilters, changes: Partial<DiscoveryFilters> = {}) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  next.sectors.forEach((value) => params.append("sector", value));
  next.stages.forEach((value) => params.append("stage", value));
  next.countries.forEach((value) => params.append("country", value));
  if (next.ask_currency) params.set("ask_currency", next.ask_currency);
  if (next.ask_min !== null) params.set("ask_min", next.ask_min);
  if (next.ask_max !== null) params.set("ask_max", next.ask_max);
  if (next.minimum_score !== null) params.set("minimum_score", String(next.minimum_score));
  if (next.verified_only) params.set("verified_only", "true");
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

function dateLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

type Props = {
  filters: DiscoveryFilters;
  result: DiscoveryResult;
  loadError: boolean;
  filterIssue: "invalid" | "pro_required" | null;
  accountName: string;
  demoPro: boolean;
  demoProExpiresAt: string | null;
};

export function DiscoveryExplorer({ filters, result, loadError, filterIssue, accountName, demoPro, demoProExpiresAt }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q);
  const [filtersOpen, setFiltersOpen] = useState(hasProDiscoveryFilters(filters) || filters.sectors.length > 1 || filters.stages.length > 1);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.replace(href(filters, { q: value, page: 1 })), 300);
  };
  const appliedCount = filters.sectors.length + filters.stages.length + filters.countries.length
    + Number(filters.ask_min !== null || filters.ask_max !== null) + Number(filters.minimum_score !== null) + Number(filters.verified_only);
  const hasFilters = Boolean(filters.q || appliedCount);
  const expires = dateLabel(demoProExpiresAt);
  const saveKey = useMemo(() => href(filters, { page: 1 }), [filters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    router.replace(href(filters, {
      sectors: data.getAll("sector") as DiscoveryFilters["sectors"],
      stages: data.getAll("stage") as DiscoveryFilters["stages"],
      countries: demoPro ? data.getAll("country") as string[] : [],
      ask_currency: demoPro ? (data.get("ask_currency")?.toString() ?? "") as DiscoveryFilters["ask_currency"] : "",
      ask_min: demoPro ? data.get("ask_min")?.toString().trim() || null : null,
      ask_max: demoPro ? data.get("ask_max")?.toString().trim() || null : null,
      minimum_score: demoPro && data.get("minimum_score") ? Number(data.get("minimum_score")) : null,
      verified_only: demoPro && data.get("verified_only") === "on",
      page: 1,
    }));
  };

  const saveSearch = () => {
    if (!demoPro) return;
    const storageKey = "pitch-deck:demo-saved-searches:v1";
    let existing: string[] = [];
    try { existing = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]; } catch { existing = []; }
    window.localStorage.setItem(storageKey, JSON.stringify([saveKey, ...existing.filter((item) => item !== saveKey)].slice(0, 5)));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4_000);
  };

  return <div className="page-canvas"><div className="page-shell">
    <section className="app-panel">
      <SiteHeader workspaceHref="/discover" workspaceLabel="Investor workspace" />
      <div className="directory-intro">
        <div><h1>Find founders who did the preparation.</h1><p className="directory-welcome">Welcome back, {accountName}. Your directory contains only profiles that passed review and remain published.</p></div>
        <div className="directory-intro-copy"><p>Search by business fit, then inspect the evidence behind each readiness signal before opening a private introduction.</p><Link href="/investor/profile">Edit investment profile</Link></div>
      </div>
      <div className="filter-bar" role="search" aria-label="Filter published startups">
        <label className="search-field"><Search size={18} /><span className="sr-only">Search startups</span><input value={query} maxLength={100} onChange={(event) => updateQuery(event.target.value)} placeholder="Search company, problem, or solution" /></label>
        <button className="button button-light filters-button" type="button" aria-expanded={filtersOpen} aria-controls="discovery-filters" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={17} /> Filters{appliedCount ? ` · ${appliedCount}` : ""}</button>
        <button className="button button-light save-search-button" type="button" disabled={!demoPro} aria-describedby="entitlement-note" onClick={saveSearch}><Bookmark size={16} /> Save search{!demoPro ? <LockKeyhole size={12} /> : null}</button>
      </div>

      <div className={demoPro ? "entitlement-note active" : "entitlement-note"} id="entitlement-note">
        {demoPro ? <><Check size={15} /><span><strong>Demo Pro active{expires ? ` through ${expires}` : ""}.</strong> Precision filters and unlimited profile views are enabled for this demonstration.</span></> : <><LockKeyhole size={14} /><span><strong>Investor Free.</strong> Search, sector, and stage filters are included, with 20 new startup profiles per UTC month. Precision filters are a Demo Pro preview.</span></>}
      </div>

      {filtersOpen ? <form className="expanded-filters" id="discovery-filters" onSubmit={applyFilters}>
        <fieldset><legend>Sector <span>Choose any</span></legend><div className="filter-choices">{founderSectors.map((sector) => <label key={sector}><input type="checkbox" name="sector" value={sector} defaultChecked={filters.sectors.includes(sector)} /><span>{sectorLabels[sector]}</span></label>)}</div></fieldset>
        <fieldset><legend>Stage <span>Choose any</span></legend><div className="filter-choices compact">{founderStages.map((stage) => <label key={stage}><input type="checkbox" name="stage" value={stage} defaultChecked={filters.stages.includes(stage)} /><span>{stageLabels[stage]}</span></label>)}</div></fieldset>
        <fieldset className={!demoPro ? "locked-filter-group" : undefined} disabled={!demoPro}><legend>Pro precision <span>{demoPro ? "Active" : "Preview locked"}</span></legend><div className="precision-grid">
          <label><span>Ask currency</span><select name="ask_currency" defaultValue={filters.ask_currency}><option value="">Any currency</option><option value="NGN">NGN</option><option value="USD">USD</option></select></label>
          <label><span>Minimum ask</span><input name="ask_min" inputMode="numeric" pattern="[0-9]*" defaultValue={filters.ask_min ?? ""} placeholder="No minimum" /></label>
          <label><span>Maximum ask</span><input name="ask_max" inputMode="numeric" pattern="[0-9]*" defaultValue={filters.ask_max ?? ""} placeholder="No maximum" /></label>
          <label><span>Minimum readiness</span><select name="minimum_score" defaultValue={filters.minimum_score ?? ""}><option value="">Any score</option><option value="50">50+</option><option value="60">60+</option><option value="70">70+</option><option value="80">80+</option><option value="90">90+</option></select></label>
        </div><div className="country-filter"><span>Countries</span><div className="filter-choices compact">{investorCountries.map(([code, label]) => <label key={code}><input type="checkbox" name="country" value={code} defaultChecked={filters.countries.includes(code)} /><span>{label}</span></label>)}</div></div><label className="verified-filter"><input type="checkbox" name="verified_only" defaultChecked={filters.verified_only} /><span>Verified Pitch-Ready only</span></label></fieldset>
        <div className="filter-actions"><Link href="/discover">Reset all</Link><button className="button button-dark" type="submit">Apply filters</button></div>
        {filterIssue ? <p className="filter-error" role="alert"><CircleAlert size={15} />{filterIssue === "pro_required" ? "Those precision filters require Demo Pro. Your basic search remains visible." : "One or more filters were invalid, so they were reset safely."}</p> : null}
      </form> : filterIssue ? <p className="filter-error collapsed" role="alert"><CircleAlert size={15} />{filterIssue === "pro_required" ? "Precision filters require Demo Pro. Open Filters to revise this search." : "Invalid filters were reset safely."}</p> : null}
      {saved ? <div className="saved-search-toast" role="status"><Check size={16} /><span><strong>Saved on this device.</strong> Demo preview — no alerts will be sent.</span></div> : null}
    </section>

    <main className="directory-layout">
      <aside className="directory-rail"><p className="rail-label">Published index</p><strong>{result.total.toString().padStart(2, "0")}</strong><span>matching profiles</span><hr /><p>Ordered by readiness signal, then most recently reviewed.</p><div className="legend"><span><i className="amber-dot" /> Earned badge</span><span><i className="grey-dot" /> Content reviewed</span></div></aside>
      <section className="results-list" aria-live="polite" aria-busy="false">
        <div className="results-heading"><div><h2>{result.total === 1 ? "1 published startup" : `${result.total} published startups`}</h2><p>Page {result.page}{result.pageCount > 0 ? ` of ${result.pageCount}` : ""}</p></div>{hasFilters && <Link href="/discover"><X size={15} /> Clear filters</Link>}</div>
        {loadError ? <div className="empty-state error-state"><CircleAlert size={25} /><h2>Discovery could not load.</h2><p>No filter or profile data was changed. Check the connection and try again.</p><button className="button button-dark" onClick={() => router.refresh()}>Try again</button></div> : result.items.length > 0 ? result.items.map((startup) => <StartupCard startup={startup} key={startup.id} />) : <div className="empty-state"><span>00</span><h2>{hasFilters ? "No profiles match this combination." : "No founders are published yet."}</h2><p>{hasFilters ? "Broaden the selected filters. Currency ranges compare only like-for-like; Pitch Deck never invents an exchange rate." : "Profiles appear here only after they pass review and are published. Nothing has been hidden behind a demo result."}</p>{hasFilters ? <Link className="button button-dark" href="/discover">Reset filters</Link> : <Link className="button button-light" href="/investor/profile">Review your investment profile</Link>}</div>}
        {result.pageCount > 1 ? <nav className="pagination" aria-label="Discovery pages"><Link aria-disabled={result.page === 1} tabIndex={result.page === 1 ? -1 : undefined} href={href(filters, { page: Math.max(1, result.page - 1) })}>Previous</Link><span>{result.page} / {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} tabIndex={result.page === result.pageCount ? -1 : undefined} href={href(filters, { page: Math.min(result.pageCount, result.page + 1) })}>Next</Link></nav> : null}
      </section>
    </main>
    <SiteFooter />
  </div></div>;
}
