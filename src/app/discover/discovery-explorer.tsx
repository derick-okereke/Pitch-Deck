"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LockKeyhole, Search, SlidersHorizontal, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartupCard } from "@/components/startup-card";
import { sectorLabels, stageLabels } from "@/lib/investor-profile";
import type { DiscoveryFilters, DiscoveryResult } from "@/lib/marketplace";
import { founderSectors, founderStages } from "@/lib/profile";

function href(filters: DiscoveryFilters, changes: Partial<DiscoveryFilters>) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.sector) params.set("sector", next.sector);
  if (next.stage) params.set("stage", next.stage);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

export function DiscoveryExplorer({ filters, result, loadError, accountName }: { filters: DiscoveryFilters; result: DiscoveryResult; loadError: boolean; accountName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.replace(href(filters, { q: value, page: 1 })), 300);
  };
  const hasFilters = Boolean(filters.q || filters.sector || filters.stage);

  return (
    <div className="page-canvas"><div className="page-shell">
      <section className="app-panel">
        <SiteHeader workspaceHref="/discover" workspaceLabel="Investor workspace" />
        <div className="directory-intro">
          <div><h1>Find founders who did the preparation.</h1><p className="directory-welcome">Welcome back, {accountName}. Your directory contains only profiles that passed review and remain published.</p></div>
          <div className="directory-intro-copy"><p>Search by business fit, then inspect the evidence behind each readiness signal before opening a private introduction.</p><Link href="/investor/profile">Edit investment profile</Link></div>
        </div>
        <div className="filter-bar" role="search" aria-label="Filter published startups">
          <label className="search-field"><Search size={18} /><span className="sr-only">Search startups</span><input value={query} maxLength={100} onChange={(event) => updateQuery(event.target.value)} placeholder="Search company, problem, or solution" /></label>
          <label><span>Sector</span><select value={filters.sector} onChange={(event) => router.replace(href(filters, { sector: event.target.value as DiscoveryFilters["sector"], page: 1 }))}><option value="">All sectors</option>{founderSectors.map((sector) => <option value={sector} key={sector}>{sectorLabels[sector]}</option>)}</select></label>
          <label><span>Stage</span><select value={filters.stage} onChange={(event) => router.replace(href(filters, { stage: event.target.value as DiscoveryFilters["stage"], page: 1 }))}><option value="">All stages</option>{founderStages.map((stage) => <option value={stage} key={stage}>{stageLabels[stage]}</option>)}</select></label>
          <button className="button button-light filters-button" type="button" aria-describedby="pro-filter-description" disabled><SlidersHorizontal size={17} /> Pro filters <LockKeyhole size={13} /></button>
        </div>
        <div className="pro-filter-note" id="pro-filter-description"><LockKeyhole size={14} /><span><strong>Investor Pro preview:</strong> ask range, country, readiness threshold, and saved searches are not yet active.</span></div>
      </section>

      <main className="directory-layout">
        <aside className="directory-rail">
          <p className="rail-label">Published index</p><strong>{result.total.toString().padStart(2, "0")}</strong><span>matching profiles</span><hr />
          <p>Ordered by readiness signal, then most recently reviewed.</p>
          <div className="legend"><span><i className="amber-dot" /> Earned badge</span><span><i className="grey-dot" /> Content reviewed</span></div>
        </aside>
        <section className="results-list" aria-live="polite" aria-busy="false">
          <div className="results-heading"><div><h2>{result.total === 1 ? "1 published startup" : `${result.total} published startups`}</h2><p>Page {result.page}{result.pageCount > 0 ? ` of ${result.pageCount}` : ""}</p></div>{hasFilters && <Link href="/discover"><X size={15} /> Clear filters</Link>}</div>
          {loadError ? (
            <div className="empty-state error-state"><CircleAlert size={25} /><h2>Discovery could not load.</h2><p>No filter or profile data was changed. Check the connection and try again.</p><button className="button button-dark" onClick={() => router.refresh()}>Try again</button></div>
          ) : result.items.length > 0 ? result.items.map((startup) => <StartupCard startup={startup} key={startup.id} />) : (
            <div className="empty-state"><span>00</span><h2>{hasFilters ? "No profiles match this combination." : "No founders are published yet."}</h2><p>{hasFilters ? "Broaden a sector, stage, or keyword. Useful filters should reduce noise without hiding the market." : "Profiles appear here only after they pass review and are published. Nothing has been hidden behind a demo result."}</p>{hasFilters ? <Link className="button button-dark" href="/discover">Reset filters</Link> : <Link className="button button-light" href="/investor/profile">Review your investment profile</Link>}</div>
          )}
          {result.pageCount > 1 ? <nav className="pagination" aria-label="Discovery pages"><Link aria-disabled={result.page === 1} tabIndex={result.page === 1 ? -1 : undefined} href={href(filters, { page: Math.max(1, result.page - 1) })}>Previous</Link><span>{result.page} / {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} tabIndex={result.page === result.pageCount ? -1 : undefined} href={href(filters, { page: Math.min(result.pageCount, result.page + 1) })}>Next</Link></nav> : null}
        </section>
      </main>
      <SiteFooter />
    </div></div>
  );
}
