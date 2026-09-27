import assert from "node:assert/strict";
import test from "node:test";
import { measureFillers, tokenizeSpokenWords, wordsPerMinute } from "../src/data/simulator-demo.ts";

test("implements the acceptance fixture for WPM and multi-word fillers", () => {
  const transcript = ["um", "you", "know", ...Array.from({ length: 117 }, (_, index) => "word" + index)].join(" ");
  const measurement = measureFillers(transcript);
  assert.equal(tokenizeSpokenWords(transcript).length, 120);
  assert.equal(wordsPerMinute(transcript, 60), 120);
  assert.equal(measurement.matchCount, 2);
  assert.equal(measurement.tokenCount, 3);
  assert.equal(measurement.percent, 2.5);
});

test("uses the canonical phrases and excludes ambiguous like", () => {
  const measurement = measureFillers("Like, uh, this is kind of clear, erm, sort of.");
  assert.equal(measurement.matchCount, 4);
  assert.equal(measurement.tokenCount, 6);
  assert.deepEqual(measurement.matchedPhrases, ["uh", "kind of", "erm", "sort of"]);
});
