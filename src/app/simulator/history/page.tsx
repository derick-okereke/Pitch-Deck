import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const pageSize = 12;

export default async function SimulatorHistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requestedPage = (await searchParams).page ?? "1";
  const page = /^\d+$/.test(requestedPage) ? Math.max(1, Math.min(1000, Number(requestedPage))) : 1;
  const supabase = await createClient();
  const { data: reports, count, error } = await supabase
    .from("simulator_reports")
    .select("session_id, session_points, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <main className="simulator-page history-page">
      <header className="simulator-page-heading">
        <Link className="back-link" href="/simulator/new"><ArrowLeft size={15} /> Practice setup</Link>
        <h1>Your practice results</h1>
        <p>Revisit the private feedback and next steps from every completed pitch session.</p>
      </header>
      <section className="history-content" aria-label="Completed practice reports">
        {error ? <div className="persistent-error" role="alert"><div><strong>Results are unavailable</strong><p>Refresh this page to try loading your reports again.</p></div></div> : reports?.length ? (
          <ol className="practice-results-list">
            {reports.map((report) => <li key={report.session_id}>
              <FileText size={19} aria-hidden="true" />
              <div><strong>Pitch practice report</strong><span>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(report.created_at))} · {Math.round(report.session_points)}/100 session score</span></div>
              <Link href={`/simulator/${report.session_id}/report`}>Review result <ArrowRight size={16} /></Link>
            </li>)}
          </ol>
        ) : <div className="history-empty"><FileText size={23} aria-hidden="true" /><h2>{page > 1 ? "No more results" : "No completed reports yet"}</h2><p>{page > 1 ? "Return to the first page of your results." : "Once you finish a pitch simulation, its coaching report will appear here."}</p><Link className="button button-dark" href={page > 1 ? "/simulator/history" : "/simulator/new"}>{page > 1 ? "First page" : "Prepare a practice session"}</Link></div>}
        {!error && totalPages > 1 ? <nav className="history-pagination" aria-label="Results pages">
          {page > 1 && <Link href={`/simulator/history?page=${page - 1}`}><ArrowLeft size={16} /> Newer results</Link>}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/simulator/history?page=${page + 1}`}>Older results <ArrowRight size={16} /></Link>}
        </nav> : null}
      </section>
    </main>
  );
}
