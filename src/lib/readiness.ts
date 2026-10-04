export type ReadinessInput = {
  contentPoints: number;
  sessionPoints: number;
  deliveryPoints: number;
  published: boolean;
  activePro: boolean;
  startedPro: boolean;
  matchingPublishedRevision: boolean;
  completed: boolean;
  fixture: boolean;
  voiceSession: boolean;
  pitchSeconds: number;
  answerSeconds: number;
  transcriptsValid: boolean;
  feedbackValid: boolean;
  deleted?: boolean;
};

export type ReadinessReason =
  | "fixture"
  | "free_session"
  | "profile_unpublished"
  | "revision_mismatch"
  | "session_incomplete"
  | "voice_required"
  | "pitch_too_short"
  | "answer_too_short"
  | "transcript_invalid"
  | "feedback_invalid"
  | "session_deleted";

const reasonCopy: Record<ReadinessReason, string> = {
  fixture: "Demo fixtures are learning-only.",
  free_session: "The session started on the free tier.",
  profile_unpublished: "The linked profile revision is not published.",
  revision_mismatch: "The session used a different profile revision.",
  session_incomplete: "The session did not complete.",
  voice_required: "Delivery points require a voice session.",
  pitch_too_short: "The pitch was shorter than 30 seconds.",
  answer_too_short: "The answer was shorter than 5 seconds.",
  transcript_invalid: "A valid pitch and answer transcript are required.",
  feedback_invalid: "Validated feedback is required.",
  session_deleted: "The qualifying session was removed.",
};

export function roundHalfUp(value: number) {
  return Math.floor(value + 0.5);
}

export function calculateReadiness(input: ReadinessInput) {
  const reasons: ReadinessReason[] = [];
  if (input.fixture) reasons.push("fixture");
  if (!input.startedPro) reasons.push("free_session");
  if (!input.published) reasons.push("profile_unpublished");
  if (!input.matchingPublishedRevision) reasons.push("revision_mismatch");
  if (!input.completed) reasons.push("session_incomplete");
  if (!input.voiceSession) reasons.push("voice_required");
  if (input.pitchSeconds < 30) reasons.push("pitch_too_short");
  if (input.answerSeconds < 5) reasons.push("answer_too_short");
  if (!input.transcriptsValid) reasons.push("transcript_invalid");
  if (!input.feedbackValid) reasons.push("feedback_invalid");
  if (input.deleted) reasons.push("session_deleted");

  const qualifying = reasons.length === 0;
  const deliveryContribution = qualifying && input.activePro ? input.deliveryPoints : 0;
  const exactReadiness = input.contentPoints + deliveryContribution;
  const badgeEarned = qualifying
    && input.activePro
    && exactReadiness >= 70
    && input.sessionPoints >= 75
    && input.deliveryPoints >= 7;

  return {
    qualifying,
    reasons,
    reasonMessages: reasons.map((reason) => reasonCopy[reason]),
    deliveryContribution,
    exactReadiness,
    displayReadiness: roundHalfUp(exactReadiness),
    badgeEarned,
    canSelectPublicAudio: qualifying && input.activePro,
  };
}

export type StoredSessionEvidence = {
  tierAtStart: "free" | "pro";
  snapshotRevisionId: string;
  publishedRevisionId: string | null;
  state: string;
  fixture: boolean;
  sessionPoints: number;
  deliveryPoints: number;
  feedbackValid: boolean;
  recordings: { segment_kind: string; question_index: number | null; transcript: string | null; duration_ms: number }[];
};

export function calculateStoredSessionReadiness(contentPoints: number, activePro: boolean, session: StoredSessionEvidence) {
  const pitch = session.recordings.find((recording) => recording.segment_kind === "pitch" && recording.question_index === null);
  const answers = [1, 2].map((index) => session.recordings.find((recording) => recording.segment_kind === "answer" && recording.question_index === index));
  const voiceSession = Boolean(pitch && answers.every(Boolean));
  const transcriptsValid = Boolean(pitch?.transcript?.trim() && answers.every((answer) => answer?.transcript?.trim()));
  return calculateReadiness({
    contentPoints,
    sessionPoints: session.sessionPoints,
    deliveryPoints: session.deliveryPoints,
    published: session.publishedRevisionId !== null,
    activePro,
    startedPro: session.tierAtStart === "pro",
    matchingPublishedRevision: session.snapshotRevisionId === session.publishedRevisionId,
    completed: session.state === "completed",
    fixture: session.fixture,
    voiceSession,
    pitchSeconds: (pitch?.duration_ms ?? 0) / 1000,
    answerSeconds: Math.min(...answers.map((answer) => (answer?.duration_ms ?? 0) / 1000)),
    transcriptsValid,
    feedbackValid: session.feedbackValid,
  });
}
