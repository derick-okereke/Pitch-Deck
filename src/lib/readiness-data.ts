import "server-only";

import { getFounderBillingOverview } from "@/lib/billing";
import { calculateStoredSessionReadiness, roundHalfUp } from "@/lib/readiness";
import { simulatorFeedbackSchema } from "@/lib/simulator";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPublishedReadiness({ founderId, startupId, revisionId, contentPoints }: {
  founderId: string;
  startupId: string;
  revisionId: string;
  contentPoints: number;
}) {
  const admin = createAdminClient();
  const [{ active }, { data: sessions, error: sessionError }] = await Promise.all([
    getFounderBillingOverview(founderId),
    admin.from("simulator_sessions")
      .select("id, tier_at_start, snapshot_revision_id, state, is_fixture")
      .eq("founder_id", founderId)
      .eq("startup_id", startupId)
      .eq("snapshot_revision_id", revisionId)
      .eq("tier_at_start", "pro")
      .eq("state", "completed"),
  ]);
  if (sessionError) throw new Error("Readiness sessions could not be loaded.");
  const ids = (sessions ?? []).map((session) => session.id);
  if (!active || ids.length === 0) {
    return { exactReadiness: contentPoints, displayReadiness: roundHalfUp(contentPoints), deliveryContribution: 0, badgeEarned: false };
  }

  const [{ data: reports, error: reportError }, { data: recordings, error: recordingError }] = await Promise.all([
    admin.from("simulator_reports").select("session_id, session_points, delivery_points, categories, persona_feedback").in("session_id", ids),
    admin.from("simulator_recordings").select("session_id, segment_kind, question_index, transcript, duration_ms").in("session_id", ids).not("accepted_at", "is", null),
  ]);
  if (reportError || recordingError) throw new Error("Readiness evidence could not be loaded.");
  const reportBySession = new Map((reports ?? []).map((report) => [report.session_id, report]));
  const recordingsBySession = new Map<string, NonNullable<typeof recordings>>();
  for (const recording of recordings ?? []) {
    const list = recordingsBySession.get(recording.session_id) ?? [];
    list.push(recording);
    recordingsBySession.set(recording.session_id, list);
  }

  let best = { exactReadiness: contentPoints, displayReadiness: roundHalfUp(contentPoints), deliveryContribution: 0, badgeEarned: false };
  for (const session of sessions ?? []) {
    const report = reportBySession.get(session.id);
    if (!report) continue;
    const result = calculateStoredSessionReadiness(contentPoints, active, {
      tierAtStart: session.tier_at_start,
      snapshotRevisionId: session.snapshot_revision_id,
      publishedRevisionId: revisionId,
      state: session.state,
      fixture: session.is_fixture,
      sessionPoints: report.session_points,
      deliveryPoints: report.delivery_points,
      feedbackValid: simulatorFeedbackSchema.safeParse({ schema_version: "1", categories: report.categories, persona_feedback: report.persona_feedback }).success,
      recordings: recordingsBySession.get(session.id) ?? [],
    });
    if (result.deliveryContribution > best.deliveryContribution) {
      best = {
        exactReadiness: result.exactReadiness,
        displayReadiness: result.displayReadiness,
        deliveryContribution: result.deliveryContribution,
        badgeEarned: result.badgeEarned,
      };
    }
  }
  return best;
}
