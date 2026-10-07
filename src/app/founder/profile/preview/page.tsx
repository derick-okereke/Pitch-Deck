import Link from "next/link";
import { ArrowLeft, AudioLines, Eye, FilePenLine, Info, MapPin } from "lucide-react";
import { z } from "zod";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { getCurrentFounderReview } from "@/lib/founder-review-data";
import { founderDraftSchema, minorToMajor } from "@/lib/profile";
import { profileCategoryWeights } from "@/lib/profile-review";
import { getPublishedReadiness } from "@/lib/readiness-data";
import { createClient } from "@/lib/supabase/server";

const publicRatingsSchema = z.array(z.object({
  key: z.enum(["clarity", "market", "traction", "team", "business_model", "competition"]),
  rating: z.number().int().min(0).max(4),
  rationale: z.string(),
  next_step: z.string(),
}).strict()).length(6);

const labels = {
  clarity: "Clarity", market: "Market", traction: "Traction", team: "Team",
  business_model: "Business model", competition: "Competition",
} as const;

const countryNames: Record<string, string> = {
  NG: "Nigeria", GH: "Ghana", KE: "Kenya", ZA: "South Africa", UG: "Uganda",
  RW: "Rwanda", TZ: "Tanzania", EG: "Egypt", GB: "United Kingdom", US: "United States",
};

function money(amountMinor: string, currency: "NGN" | "USD") {
  if (!amountMinor) return "Not stated";
  const amount = Number(minorToMajor(amountMinor));
  return currency === "USD"
    ? `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USD`
    : `NGN ${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(amount)}`;
}

export default async function ProfilePreview({ searchParams }: { searchParams: Promise<{ revision?: string }> }) {
  const requested = (await searchParams).revision;
  const workspace = await getFounderWorkspace();
  if (!workspace.startupId) {
    return <main className="preview-page"><section className="review-empty-state"><div><strong>No founder profile yet</strong><p>Save the five draft fields first, then return here to inspect the exact investor-facing projection.</p><Link className="button button-dark" href="/founder/profile/edit"><FilePenLine size={16} /> Create the draft</Link></div></section></main>;
  }

  const supabase = await createClient();
  let draft = workspace.draft;
  let revisionNumber: number | null = null;
  let review: { id: string; content_points: number | null; ratings: unknown; completed_at: string | null; state: string } | null = null;
  const showPublished = requested === "published" && Boolean(workspace.publishedRevisionId);

  if (showPublished && workspace.publishedRevisionId) {
    const { data: revision } = await supabase.from("profile_revisions").select("id, revision_number, payload").eq("id", workspace.publishedRevisionId).maybeSingle();
    const parsed = founderDraftSchema.safeParse(revision?.payload);
    if (revision && parsed.success) {
      draft = parsed.data;
      revisionNumber = revision.revision_number;
      const { data } = await supabase.from("profile_reviews").select("id, content_points, ratings, completed_at, state").eq("revision_id", revision.id).eq("rubric_version", "readiness-v1").maybeSingle();
      review = data;
    }
  } else {
    const currentReview = await getCurrentFounderReview(workspace);
    revisionNumber = currentReview?.revisionNumber ?? null;
    review = currentReview;
  }

  const ratings = publicRatingsSchema.safeParse(review?.ratings);
  const contentPoints = review && ["passed", "needs_improvement"].includes(review.state) ? review.content_points : null;
  const readiness = showPublished && workspace.publishedRevisionId && contentPoints !== null
    ? await getPublishedReadiness({ founderId: workspace.ownerId, startupId: workspace.startupId, revisionId: workspace.publishedRevisionId, contentPoints })
    : null;
  const displayScore = contentPoints === null ? null : readiness?.displayReadiness ?? Math.floor(contentPoints + 0.5);
  const location = [draft.city, countryNames[draft.country] ?? draft.country].filter(Boolean).join(", ");
  const modeLabel = showPublished ? `Published revision ${revisionNumber ?? ""}` : `Draft version ${workspace.draftVersion}`;

  return (
    <main className="preview-page">
      <div className="preview-banner"><div><Eye size={18} /><span><strong>Investor preview</strong> · {modeLabel}</span></div><p>Private coaching notes, contact details, and simulator Q&A are never shown here.</p><Link href="/founder/reviews">Reviews</Link><Link href="/founder/profile/edit"><FilePenLine size={15} /> Edit draft</Link></div>
      {review ? <div className="preview-review-actions"><span>{review.state === "passed" ? "This content passed review." : review.state === "needs_improvement" ? "This content needs improvement before publication." : "This content has a review in progress or awaiting retry."} {!showPublished && workspace.publicationStatus !== "published" ? "Your profile is still private." : ""}</span><Link className="button button-light" href={`/founder/reviews/${review.id}`}>{review.state === "passed" && !showPublished ? "View review and publication options" : "View review"}</Link></div> : null}
      {workspace.publishedRevisionId ? <nav className="preview-switcher" aria-label="Preview revision"><Link aria-current={!showPublished ? "page" : undefined} href="/founder/profile/preview?revision=draft">Current draft</Link><Link aria-current={showPublished ? "page" : undefined} href="/founder/profile/preview?revision=published">Published profile</Link></nav> : null}
      <section className="founder-preview-hero">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="preview-hero-grid"><div><p className="preview-context">{showPublished ? "Investor-visible profile" : "Private draft preview"} · {draft.sector.replaceAll("-", " ")} · {draft.stage}</p><h1>{draft.name}</h1><p>{draft.tagline}</p><div className="detail-meta"><span><MapPin size={15} />{location}</span><span>Raising <strong>{money(draft.ask_amount_minor, draft.ask_currency)}</strong></span></div></div><aside className="score-panel">{displayScore === null ? <div className="score-unreviewed"><strong>—</strong><span>Not reviewed</span></div> : <div className="score-ring" style={{ "--score": `${displayScore * 3.6}deg` } as React.CSSProperties}><div><strong>{displayScore}</strong><span>/ 100</span></div></div>}<p>Pitch-Readiness Score</p><span className="score-date">{review?.completed_at ? `Content assessed ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(review.completed_at))}` : "Submit this draft for review"}</span></aside></div>
      </section>
      <section className="preview-content-grid">
        <div className="preview-narrative"><article><p className="section-number">01 / THE CASE</p><h2>The problem</h2><p>{draft.problem || "Not provided in this draft."}</p><h2>The solution</h2><p>{draft.solution || "Not provided in this draft."}</p></article><article><p className="section-number">02 / MARKET EVIDENCE</p><h2>Market</h2><p>{draft.market.explanation || "No market explanation provided."}</p><h2>Traction</h2><p>{draft.traction.evidence_note || "No stage evidence provided."}</p></article><article><p className="section-number">03 / TEAM & MODEL</p><h2>Team</h2>{draft.team.length ? draft.team.map((member) => <p key={`${member.name}-${member.role}`}><strong>{member.name || "Unnamed team member"}{member.role ? ` — ${member.role}` : ""}</strong><br />{member.relevant_experience || "Relevant experience not provided."}</p>) : <p>No team evidence provided.</p>}<h2>Business model</h2><p>{draft.business_model || "Not provided in this draft."}</p><h2>Competition</h2><p>{draft.competition || "Not provided in this draft."}</p><h2>Funding ask</h2><p>{draft.use_of_funds || "Use of funds not provided."}</p></article></div>
        <aside className="preview-evidence"><p className="preview-context">Readiness evidence</p>{ratings.success ? ratings.data.map((category) => { const weight = profileCategoryWeights[category.key]; const points = weight * category.rating / 4; return <div className="mini-score-row" key={category.key}><span>{labels[category.key]}</span><div><i style={{ width: `${category.rating / 4 * 100}%` }} /></div><strong>{points}/{weight}</strong></div>; }) : <div className="preview-no-review"><strong>No completed review</strong><p>This draft has no validated category evidence yet.</p></div>}<div className="score-disclosure"><Info size={15} /><p>AI-assessed pitch readiness; business claims are self-reported. Content contributes up to 90 points and eligible Pro delivery contributes up to 10. Current delivery: {readiness?.deliveryContribution ?? 0}/10.</p></div><hr /><div className="audio-empty"><AudioLines size={20} /><div><strong>No public pitch recording</strong><span>The founder chooses an eligible recording explicitly.</span></div></div></aside>
      </section>
    </main>
  );
}
