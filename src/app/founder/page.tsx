import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, AudioLines, Check, Clock3, FilePenLine, LockKeyhole, UserRoundCheck } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { getFounderBillingOverview } from "@/lib/billing";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { getPublishedReadiness } from "@/lib/readiness-data";
import { createClient } from "@/lib/supabase/server";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function FounderDashboard() {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  const firstName = account.displayName.split(/\s+/)[0] || account.displayName;
  const [billing, workspace] = await Promise.all([getFounderBillingOverview(account.id), getFounderWorkspace()]);
  let readinessScore: number | null = null;
  if (workspace.startupId && workspace.publishedRevisionId) {
    const supabase = await createClient();
    const { data: review } = await supabase.from("profile_reviews")
      .select("content_points, state")
      .eq("revision_id", workspace.publishedRevisionId)
      .eq("rubric_version", "readiness-v1")
      .maybeSingle();
    if (review?.state === "passed" && review.content_points !== null) {
      const readiness = await getPublishedReadiness({ founderId: account.id, startupId: workspace.startupId, revisionId: workspace.publishedRevisionId, contentPoints: review.content_points });
      readinessScore = readiness.displayReadiness;
    }
  }

  return (
    <main className="founder-main">
      <section className="founder-title-row">
        <div>
          <h1>Welcome, {firstName}.</h1>
          <p>Your private founder workspace{account.organizationName ? ` for ${account.organizationName}` : ""} is ready.</p>
        </div>
        <Link className="button button-light" href="/founder/profile/edit"><FilePenLine size={16} /> Start founder profile</Link>
      </section>

      <section className="next-action-panel">
        <div>
          <h2>Turn the idea into an investor-ready case.</h2>
          <p>Start with the problem, solution, team, and funding ask. Your profile remains private until it clears review and you choose to publish it.</p>
        </div>
        <div className="next-action-cta">
          <Link className="button button-light" href="/founder/profile/edit">Build the profile <ArrowRight size={16} /></Link>
          <span><LockKeyhole size={14} /> Private by default</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-score-card">
          <div className="card-heading">
            <div><p className="eyebrow">Readiness score</p><h2>{readinessScore ?? "—"}<span>/100</span></h2></div>
            <span className="status-tag">{readinessScore === null ? <Clock3 size={13} /> : <Check size={13} />}{readinessScore === null ? "Not reviewed" : "Published"}</span>
          </div>
          <div className="score-cap">
            <div><i style={{ width: `${readinessScore ?? 0}%` }} /></div>
            <p>{readinessScore === null ? <><strong>No score yet.</strong> Submit a complete founder profile to receive category-by-category evidence and a publication decision.</> : <><strong>Your published readiness.</strong> Content contributes up to 90 points; qualifying Pro delivery contributes up to 10.</>}</p>
          </div>
          <Link className="inline-link" href="/founder/profile/edit">Complete the evidence <ArrowRight size={15} /></Link>
        </article>

        <article className="dashboard-status-card">
          <p className="eyebrow">Workspace</p>
          <h2>{account.organizationName ?? "Name your startup in the profile"}</h2>
          <dl>
            <div><dt>Profile</dt><dd>{workspace.publicationStatus === "published" ? "Published" : "Private draft"}</dd></div>
            <div><dt>Member since</dt><dd>{shortDate(account.createdAt)}</dd></div>
            <div><dt>Owner</dt><dd>{account.displayName}</dd></div>
          </dl>
          <Link className="button button-light" href="/founder/profile/edit"><FilePenLine size={16} /> Open profile editor</Link>
        </article>

        <article className="dashboard-activity-card">
          <p className="eyebrow">Account activity</p>
          <div className="activity-item">
            <span><UserRoundCheck size={17} /></span>
            <div><strong>Email confirmed</strong><p>Your protected workspace is active.</p></div>
            <Check size={15} aria-label="Complete" />
          </div>
          <div className="activity-item">
            <span><AudioLines size={17} /></span>
            <div><strong>Practice room available</strong><p>{billing.active ? "Unlimited Founder Pro practice is active." : "Three learning sessions are included."}</p></div>
            <span />
          </div>
          <Link className="inline-link dashboard-report-link" href="/simulator/new">Prepare a practice session <ArrowRight size={14} /></Link>
        </article>

        <article className="dashboard-breakdown-card">
          <p className="eyebrow">Profile progress</p>
          {["Problem and solution", "Team credibility", "Funding ask"].map((label) => (
            <div className="mini-score-row" key={label}>
              <span>{label}</span><div><i style={{ width: "0%" }} /></div><strong>Open</strong>
            </div>
          ))}
          <p className="private-note"><LockKeyhole size={14} /> Nothing in this workspace is public until you submit, pass review, and publish.</p>
        </article>
      </section>
    </main>
  );
}
