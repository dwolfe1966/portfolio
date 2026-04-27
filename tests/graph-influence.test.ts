import assert from "node:assert/strict";
import test from "node:test";

import { buildGraphInfluenceModel, getStrongestInfluencePath, rankInfluencePaths } from "@/lib/graph-influence";

test("buildGraphInfluenceModel returns stable defaults with zeroed inputs", () => {
  const model = buildGraphInfluenceModel({ users: 0, entities: 0, edges: 0, events: 0 });

  assert.equal(model.clusters.length, 3);
  assert.equal(model.links.length, 3);
  assert.ok(model.clusters.every((cluster) => cluster.nodeCount >= 1));
  assert.ok(model.links.every((link) => link.weight >= 1));
});

test("buildGraphInfluenceModel clamps influence to 0-100", () => {
  const model = buildGraphInfluenceModel({ users: 10, entities: 2, edges: 800, events: 1000 });

  assert.ok(model.clusters.every((cluster) => cluster.influence >= 0 && cluster.influence <= 100));
});

test("buildGraphInfluenceModel preserves expected link directions", () => {
  const model = buildGraphInfluenceModel({ users: 220, entities: 80, edges: 420, events: 120 });
  const directions = model.links.map((link) => `${link.from}->${link.to}`);

  assert.deepEqual(directions.sort(), [
    "discovery->conversion",
    "discovery->intent",
    "intent->conversion"
  ]);
});


test("getStrongestInfluencePath returns highest weighted path label", () => {
  const model = buildGraphInfluenceModel({ users: 320, entities: 90, edges: 640, events: 210 });
  const summary = getStrongestInfluencePath(model.links);

  assert.match(summary, /(Discovery|Intent) → (Intent|Conversion) \(w\d+\)/);
});



test("rankInfluencePaths orders by weight then label", () => {
  const ranked = rankInfluencePaths([
    { from: "intent", to: "conversion", weight: 5 },
    { from: "discovery", to: "intent", weight: 7 },
    { from: "discovery", to: "conversion", weight: 7 }
  ]);

  assert.deepEqual(ranked.map((entry) => entry.label), [
    "Discovery → Conversion",
    "Discovery → Intent",
    "Intent → Conversion"
  ]);
});
