import assert from "node:assert/strict";
import test from "node:test";
import { azureSpeechSsml, azureVoiceName } from "../src/lib/azure-speech.ts";

test("maps the two Nigerian panel styles and the European style to distinct voices", () => {
  assert.equal(azureVoiceName("warm-rigorous"), "en-NG-EzinneNeural");
  assert.equal(azureVoiceName("direct-analytical"), "en-NG-AbeoNeural");
  assert.equal(azureVoiceName("calm-strategic"), "en-GB-LibbyNeural");
});

test("escapes generated question text before placing it in Azure SSML", () => {
  const ssml = azureSpeechSsml('Could A&B beat <the market> and "why"?', "warm-rigorous");
  assert.match(ssml, /xml:lang="en-NG"/);
  assert.match(ssml, /name="en-NG-EzinneNeural"/);
  assert.match(ssml, /Could A&amp;B beat &lt;the market&gt; and &quot;why&quot;\?/);
  assert.doesNotMatch(ssml, /<the market>/);
});
