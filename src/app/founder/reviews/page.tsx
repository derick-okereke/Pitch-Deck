import Link from "next/link";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { getFounderReviewHistory } from "@/lib/founder-review-data";

export default async function ReviewHistoryPage() {
  const reviews = await getFounderReviewHistory(await getFounderWorkspace());
  const labels = { passed: "Passed", needs_improvement: "Needs improvement", reviewing: "Reviewing", review_failed: "Interrupted" };
  return <main className="review-page">
    <section className="review-summary review-summary-state"><Link className="back-link" href="/founder">Founder overview</Link><h1>Your profile reviews</h1><p>Open a completed review to see its score and evidence, or publish a revision that passed.</p></section>
    <section className="review-empty-state"><div>
      {reviews.length ? <ul className="review-history-list">{reviews.map((review) => <li key={review.id}>
        <div><strong>Revision {review.revisionNumber} · {labels[review.state]}</strong><p>{review.content_points !== null ? `${review.content_points}/90 content points` : "No completed score"}{review.matchesDraft ? " · Matches your saved draft" : " · Earlier content"}{review.published ? " · Published" : " · Private"}</p></div>
        <Link className="button button-light" href={`/founder/reviews/${review.id}`}>View review</Link>
      </li>)}</ul> : <><strong>No profile reviews yet</strong><p>Submit your saved draft to receive a review.</p></>}
      <Link className="inline-link" href="/founder/profile/edit">Return to the profile editor</Link>
    </div></section>
  </main>;
}
