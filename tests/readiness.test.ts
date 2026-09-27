import test from "node:test";
import assert from "node:assert/strict";
import { calculateReadiness, roundHalfUp, type ReadinessInput } from "../src/lib/readiness.ts";
import { simulatorReport, spokenCategories } from "../src/data/simulator-demo.ts";

const qualifyingSession: ReadinessInput = {
  contentPoints: 65,
  sessionPoints: 80,
  deliveryPoints: 7.5,
  published: true,
  activePro: true,
  startedPro: true,
  matchingPublishedRevision: true,
  completed: true,
  fixture: false,
  voiceSession: true,
  pitchSeconds: 102,
  answerSeconds: 24,
  transcriptsValid: true,
  feedbackValid: true,
};

test("applies only eligible delivery points and earns the badge at exact thresholds", () => {
  const result = calculateReadiness(qualifyingSession);
  assert.equal(result.qualifying, true);
  assert.equal(result.exactReadiness, 72.5);
  assert.equal(result.displayReadiness, 73);
  assert.equal(result.badgeEarned, true);
  assert.equal(result.canSelectPublicAudio, true);
});

test("keeps fixture and free sessions learning-only", () => {
  const result = calculateReadiness({ ...qualifyingSession, fixture: true, startedPro: false });
  assert.equal(result.qualifying, false);
  assert.equal(result.deliveryContribution, 0);
  assert.equal(result.exactReadiness, 65);
  assert.deepEqual(result.reasons, ["fixture", "free_session"]);
  assert.equal(result.badgeEarned, false);
  assert.equal(result.canSelectPublicAudio, false);
});

test("rejects stale revisions and incomplete evidence", () => {
  const result = calculateReadiness({
    ...qualifyingSession,
    matchingPublishedRevision: false,
    transcriptsValid: false,
    feedbackValid: false,
  });
  assert.deepEqual(result.reasons, ["revision_mismatch", "transcript_invalid", "feedback_invalid"]);
  assert.equal(result.deliveryContribution, 0);
});

test("removes public effects when Pro expires while preserving session qualification", () => {
  const result = calculateReadiness({ ...qualifyingSession, activePro: false });
  assert.equal(result.qualifying, true);
  assert.equal(result.deliveryContribution, 0);
  assert.equal(result.badgeEarned, false);
  assert.equal(result.canSelectPublicAudio, false);
});

test("does not award a badge from delivery alone", () => {
  const result = calculateReadiness({ ...qualifyingSession, contentPoints: 61, sessionPoints: 74 });
  assert.equal(result.exactReadiness, 68.5);
  assert.equal(result.badgeEarned, false);
});

test("uses round-half-up only for display", () => {
  assert.equal(roundHalfUp(72.5), 73);
  assert.equal(roundHalfUp(72.49), 72);
});

test("keeps report evidence grounded in the stored transcripts", () => {
  const transcript = simulatorReport.pitchTranscript + " " + simulatorReport.answerTranscript;
  spokenCategories.forEach((category) => assert.ok(transcript.includes(category.evidence), category.label));
  simulatorReport.feedback.forEach((feedback) => assert.ok(transcript.includes(feedback.evidence), feedback.personaKey));
  simulatorReport.priorities.forEach((priority) => {
    if (priority.evidence) assert.ok(transcript.includes(priority.evidence), priority.title);
  });
});
