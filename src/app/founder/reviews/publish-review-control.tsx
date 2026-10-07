"use client";

import Link from "next/link";
import { useActionState } from "react";
import { publishFounderReview, type PublicationState } from "./publish-review-action";

const initialState: PublicationState = { status: "idle", message: "" };

export function PublishReviewControl({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState(publishFounderReview, initialState);
  return <form action={action} className="publish-review-control">
    <input type="hidden" name="review_id" value={reviewId} />
    <p>Publish this reviewed revision so eligible investors can find its profile and readiness score in discovery. Your private coaching notes and contact details stay private.</p>
    <button className="button button-dark" type="submit" disabled={pending || state.status === "published"}>{pending ? "Publishing…" : state.status === "published" ? "Published" : "Publish this profile"}</button>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    {state.status === "published" ? <Link href="/founder/profile/preview?revision=published">View published profile</Link> : null}
  </form>;
}
