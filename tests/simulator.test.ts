import assert from "node:assert/strict";
import test from "node:test";
import { personaInitials, simulatorPersonasSchema, simulatorQuestionsSchema } from "../src/lib/simulator.ts";

const panel = {
  schema_version: "1",
  personas: [
    { persona_key: "p1", name: "Nadia Ibe", title: "Early-stage operator", focus: "Tests whether the customer problem is specific and urgent.", voice_style: "warm-rigorous" },
    { persona_key: "p2", name: "Tunde Osei", title: "Commercial investor", focus: "Challenges the reachable market and evidence behind demand.", voice_style: "direct-analytical" },
    { persona_key: "p3", name: "Lerato Mbeki", title: "Sector strategist", focus: "Examines execution risk, milestones, and operating assumptions.", voice_style: "calm-strategic" },
  ],
};

test("accepts a complete, distinct fictional panel", () => {
  assert.equal(simulatorPersonasSchema.safeParse(panel).success, true);
});

test("rejects duplicate persona keys and duplicate focus", () => {
  const duplicate = structuredClone(panel);
  duplicate.personas[2].persona_key = "p2";
  duplicate.personas[2].focus = duplicate.personas[1].focus;
  const result = simulatorPersonasSchema.safeParse(duplicate);
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.length >= 2);
});

test("derives stable two-letter persona marks", () => {
  assert.equal(personaInitials("Lerato Mbeki"), "LM");
  assert.equal(personaInitials("Nadia"), "N");
});

test("accepts exactly two questions from two different panel members", () => {
  const result = simulatorQuestionsSchema.safeParse({
    schema_version: "1",
    questions: [
      { question_index: 1, persona_key: "p1", question: "Which customer interview most changed your view of the problem?", source_quote: "customer interviews", focus_category: "problem" },
      { question_index: 2, persona_key: "p3", question: "What milestone would prove this operating model can scale responsibly?", source_quote: "operating model", focus_category: "traction" },
    ],
  });
  assert.equal(result.success, true);
});

test("rejects a two-question round when the same persona asks twice", () => {
  const result = simulatorQuestionsSchema.safeParse({
    schema_version: "1",
    questions: [
      { question_index: 1, persona_key: "p2", question: "How did you calculate the reachable market for this first launch?", source_quote: "reachable market", focus_category: "market" },
      { question_index: 2, persona_key: "p2", question: "Which assumption in that market estimate will you test first?", source_quote: "market estimate", focus_category: "market" },
    ],
  });
  assert.equal(result.success, false);
});
