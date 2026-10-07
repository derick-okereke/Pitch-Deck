import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, FilePenLine, Info, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { profileCategoryWeights, type ProfileCategoryKey } from "@/lib/profile-review";
import { getPublishedReadiness } from "@/lib/readiness-data";
import { createClient } from "@/lib/supabase/server";
import { founderContentHash } from "@/lib/profile-content";
import { founderDraftSchema } from "@/lib/profile";
import { PublishReviewControl } from "../publish-review-control";

const storedRatingSchema = z.array(z.object({
  key: z.enum(["clarity", "market", "traction", "team", "business_model", "competition"]),
  rating: z.number().int().min(0).max(4),
  rationale: z.string(),
  next_step: z.string(),
}).strict()).length(6);

const storedEvidenceSchema = z.array(z.object({
  key: z.enum(["clarity", "market", "traction", "team", "business_model", "competition"]),
  evidence: z.array(z.object({ source_field: z.string(), quote: z.string() }).strict()),
}).strict());

const storedFlagsSchema = z.array(z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
}).strict());

const labels: Record<ProfileCategoryKey, string> = {
  clarity: "Clarity", market: "Market", traction: "Traction", team: "Team",
  business_model: "Business model", competition: "Competition",
};

const editSections: Record<ProfileCategoryKey, string> = {
  clarity: "problem", market: "market", traction: "market", team: "team",
  business_model: "business", competition: "business",
};

function ReviewState({ state, reviewId }: { state: "reviewing" | "review_failed"; reviewId: string }) {
  const failed = state === "review_failed";
  return (
    <main className="review-page">
      <section className="review-summary review-summary-state">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="review-summary-grid"><div><p className="review-context">Profile review</p><span className="status-tag status-reviewing">{failed ? <CircleAlert size={13} /> : <Clock3 size={13} />}{failed ? "Review interrupted" : "Reviewing"}</span><h1>{failed ? "Your draft is safe. The review did not complete." : "Your evidence is being checked."}</h1><p>{failed ? "No score or publication decision was created. Return to the editor and submit the unchanged draft again when the provider is available." : "The submitted revision is immutable while the six rubric categories and their evidence quotes are validated."}</p></div></div>
      </section>
      <section className="review-empty-state"><div><strong>{failed ? "Provider recovery" : "Revision secured"}</strong><p>{failed ? "The failed operation never becomes a zero score and does not replace a previously published revision." : "This page will show the server-calculated score, exact evidence, and publication result when processing completes."}</p><Link className="button button-dark" href="/founder/profile/edit"><FilePenLine size={16} /> {failed ? "Return and retry" : "Return to the draft"}</Link><small>Review ID {reviewId}</small></div></section>
    </main>
  );
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: review } = await supabase.from("profile_reviews").select("*").eq("id", id).maybeSingle();
  if (!review) notFound();
  if (review.state === "reviewing" || review.state === "review_failed") return <ReviewState state={review.state} reviewId={review.id} />;

  const { data: revision } = await supabase.from("profile_revisions").select("id, startup_id, revision_number, draft_version, content_hash, created_at").eq("id", review.revision_id).maybeSingle();
  if (!revision) notFound();
  const { data: startup } = await supabase.from("startups").select("founder_id, draft_payload, draft_version, published_revision_id, publication_status").eq("id", revision.startup_id).maybeSingle();
  if (!startup) notFound();

  const ratingsResult = storedRatingSchema.safeParse(review.ratings);
  const evidenceResult = storedEvidenceSchema.safeParse(review.evidence);
  const flagsResult = storedFlagsSchema.safeParse(review.flags);
  if (!ratingsResult.success || !evidenceResult.success || !flagsResult.success || review.content_points === null) {
    return <ReviewState state="review_failed" reviewId={review.id} />;
  }

  const evidence = new Map(evidenceResult.data.map((item) => [item.key, item.evidence]));
  const passed = review.state === "passed";
  const published = startup.publication_status === "published" && startup.published_revision_id === revision.id;
  const currentDraft = founderDraftSchema.safeParse(startup.draft_payload);
  const reviewedEarlierDraft = !currentDraft.success || founderContentHash(currentDraft.data) !== revision.content_hash;
  const readiness = published
    ? await getPublishedReadiness({ founderId: startup.founder_id, startupId: revision.startup_id, revisionId: revision.id, contentPoints: review.content_points })
    : null;
  const displayScore = readiness?.displayReadiness ?? Math.floor(review.content_points + 0.5);
  const completedDate = review.completed_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(review.completed_at)) : "Not completed";
  const headline = !passed ? "The case needs more evidence before publication." : published ? "Your case is published in discovery." : "This revision passed and is ready to publish.";

  return (
    <main className="review-page">
      <section className="review-summary">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <Link className="back-link" href="/founder/reviews">All reviews</Link>
        <div className="review-summary-grid"><div><p className="review-context">Profile review · Revision {revision.revision_number}</p><span className={`status-tag ${published ? "status-published" : "status-reviewed"}`}>{passed ? <Check size={13} /> : <CircleAlert size={13} />}{published ? "Passed and published" : passed ? "Passed" : "Needs improvement"}</span><h1>{headline}</h1><p>{reviewedEarlierDraft ? "This result belongs to an earlier draft. Your current draft remains separate and was not overwritten." : "Every category below cites only evidence from the submitted revision. The model did not set the total or publication threshold."}</p></div><div className="review-score"><strong>{displayScore}</strong><span>readiness points / 100</span><small>{review.content_points}/90 content · {readiness?.deliveryContribution ?? 0}/10 delivery · Publish at 50 content</small></div></div>
      </section>
      <section className="review-layout">
        <div className="review-categories">
          <div className="review-heading"><div><p className="review-context">Category evidence</p><h2>What the review found</h2></div><p>Ratings run from 0–4. The server applies the fixed category weights and calculates the exact total.</p></div>
          {ratingsResult.data.map((category) => {
            const weight = profileCategoryWeights[category.key];
            const points = weight * category.rating / 4;
            const state = category.rating >= 3 ? "Strong" : category.rating === 2 ? "Developing" : "Improve";
            return <article className="review-category" key={category.key}><div className="review-category-score"><span>{labels[category.key]}</span><strong>{points}<small>/{weight}</small></strong></div><div className="review-category-bar" aria-label={`${category.rating} out of 4`}><i style={{ width: `${category.rating / 4 * 100}%` }} /></div><div className="review-category-note"><span className={`review-state ${category.rating >= 3 ? "strong" : ""}`}>{state}</span><p>{category.rationale}</p>{evidence.get(category.key)?.map((item) => <blockquote key={`${item.source_field}-${item.quote}`}><span>{item.source_field.replaceAll("_", " ")}</span>“{item.quote}”</blockquote>)}<strong className="review-next-step">Next: {category.next_step}</strong></div><Link href={`/founder/profile/edit#${editSections[category.key]}`}>Edit section <ArrowRight size={14} /></Link></article>;
          })}
        </div>
        <aside className="review-sidebar">
          {passed && !published ? <div><h3>Ready to publish</h3>{reviewedEarlierDraft ? <p>This publishes the reviewed revision, which differs from your current draft.</p> : null}<PublishReviewControl reviewId={review.id} /></div> : published ? <div><h3>Published in discovery</h3><Link className="button button-light" href="/founder/profile/preview?revision=published">View published profile</Link></div> : null}
          <div><p className="review-context">Priority improvements</p>{flagsResult.data.length ? <ol>{flagsResult.data.map((flag, index) => <li key={`${flag.field}-${flag.code}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{flag.field.replaceAll("_", " ")}</strong><p>{flag.message}</p></div></li>)}</ol> : <p className="review-no-flags">No additional flags were returned. Use each category’s next step to strengthen the next revision.</p>}<Link className="button button-dark" href="/founder/profile/edit"><FilePenLine size={16} /> Improve the draft</Link></div>
          <div className="score-rule-card"><ShieldCheck size={19} /><h3>How publication works</h3><p>The exact score is {review.content_points}. Profiles pass at 50 or above. Display rounding never changes that decision.</p></div>
          <div className="score-rule-card"><CircleAlert size={19} /><h3>What this does not verify</h3><p>The review checks pitch readiness. It does not verify business claims, predict returns, or guarantee investor interest.</p></div>
          <p className="review-version"><Info size={13} /> {review.rubric_version} · Revision {revision.revision_number} · {completedDate}</p>
        </aside>
      </section>
    </main>
  );
}
