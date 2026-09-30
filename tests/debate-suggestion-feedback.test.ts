import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CASAP_PUBLIC_EVIDENCE_ANALYSIS, deriveDebateCandidates, INITIAL_DEBATES } from "../lib/compounding-expertise-lab";
import { changedDebateSections, debateReviewSnapshots, DEBATE_REVIEW_SECTIONS } from "../lib/debate-suggestion-feedback";
import { DEBATE_ARGUMENT_STRUCTURE } from "../lib/debate-argument-structure";

function candidates() {
  return deriveDebateCandidates({ analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, debates: INITIAL_DEBATES, rows: [] });
}

test("identical content and new database IDs do not produce change highlights", () => {
  const before = candidates();
  const after = before.map((item) => ({ ...item, sourceDebate: item.sourceDebate ? { ...item.sourceDebate, id: "new-id", source: "AI" as const } : undefined }));
  assert.deepEqual(changedDebateSections(debateReviewSnapshots(before), debateReviewSnapshots(after)), []);
});

test("argument-only change highlights the argument and editor, not evidence or thesis", () => {
  const before = candidates();
  const index = before.findIndex((item) => item.sourceDebate);
  assert.ok(index >= 0);
  const after = structuredClone(before);
  after[index].sourceDebate!.bullCase = "A revised argument, not new evidence.";
  assert.deepEqual(changedDebateSections(debateReviewSnapshots(before), debateReviewSnapshots(after)), [{
    family: before[index].family, title: before[index].title, isNew: false, sections: ["argument", "editor"]
  }]);
});

test("changes to interpretation or evidence do not get labeled AI suggestions", () => {
  const before = candidates();
  const after = before.map((item) => ({ ...item, assessmentReason: "Different evidence", evidenceCoverage: "Changed count" }));
  assert.deepEqual(changedDebateSections(debateReviewSnapshots(before), debateReviewSnapshots(after)), []);
});

test("family order is immaterial; new debates expose every review section", () => {
  const snapshots = debateReviewSnapshots(candidates());
  assert.deepEqual(changedDebateSections(snapshots, [...snapshots].reverse()), []);
  const change = changedDebateSections([], snapshots.slice(0, 1));
  assert.deepEqual(change[0].sections, [...DEBATE_REVIEW_SECTIONS]);
  assert.equal(change[0].isNew, true);
});

test("a second run compares against the latest content, not the initial content", () => {
  const original = debateReviewSnapshots(candidates());
  const firstRun = structuredClone(original);
  firstRun[0].sections.proposition = "First change";
  const secondRun = structuredClone(firstRun);
  secondRun[0].sections.belief = "Second change";
  assert.deepEqual(changedDebateSections(firstRun, secondRun)[0].sections, ["belief"]);
});

test("every debate family has a clear hypothesis and three non-scored subclaims", () => {
  assert.equal(Object.keys(DEBATE_ARGUMENT_STRUCTURE).length, 8);
  for (const structure of Object.values(DEBATE_ARGUMENT_STRUCTURE)) {
    assert.ok(structure.thesis.length > 20);
    assert.equal(structure.subclaims.length, 3);
    assert.equal(new Set(structure.subclaims).size, 3);
  }
  assert.match(DEBATE_ARGUMENT_STRUCTURE.REBUILDABILITY_COMPRESSION.thesis, /cannot cheaply reconstruct/);
});

test("generation uses inline feedback and a transaction, and never saves a fallback over debates", () => {
  const source = readFileSync("app/(demo)/compounding-expertise/actions.ts", "utf8");
  const action = source.slice(source.indexOf("export async function generateDebatesAction"), source.indexOf("export async function saveDiagnosticAction"));
  assert.match(action, /Promise<DebateSuggestionResult>/);
  assert.match(action, /compoundingAnalysisAccessWhere\(accountUserId, analysisId\)/);
  assert.ok(action.indexOf("if (!result.ok)") < action.indexOf("db.$transaction"));
  assert.ok(action.indexOf("db.$transaction") < action.indexOf("deleteMany"));
  assert.doesNotMatch(action, /redirect\(/);
});

test("brief separates supporting, contradicting, contextual, and missing evidence", () => {
  const source = readFileSync("components/compounding-expertise/DebateArgumentBrief.tsx", "utf8");
  for (const label of ["Bottom line", "Thesis being tested", "Subclaims: what must be true", "What evidence exists?", "What is still lacking?", "Next decisive test", "Context only — not proof"]) {
    assert.ok(source.includes(label), label);
  }
  assert.match(source, /individual subclaims are not separately scored/);
  assert.match(source, /item\.provenance/);
  assert.match(source, /item\.limitation/);
});
