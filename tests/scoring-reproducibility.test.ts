import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePriorityBreakdown,
  calculatePriorityScore,
  type ChangeType,
  type Segment
} from "@/lib/scoring";

const CANONICAL_INPUT = {
  interestScore: 0.84,
  segment: "TRIAL" as Segment,
  changeType: "PHONE_CHANGED" as ChangeType,
  recencyScore: 0.7
};

test("calculatePriorityScore is deterministic across repeated calls", () => {
  const first = calculatePriorityScore(CANONICAL_INPUT);
  for (let i = 0; i < 1000; i++) {
    assert.equal(calculatePriorityScore(CANONICAL_INPUT), first);
  }
});

test("calculatePriorityBreakdown is deterministic across repeated calls", () => {
  const first = calculatePriorityBreakdown(CANONICAL_INPUT);
  for (let i = 0; i < 100; i++) {
    assert.deepEqual(calculatePriorityBreakdown(CANONICAL_INPUT), first);
  }
});

test("calculatePriorityScore produces a stable snapshot for canonical input", () => {
  const breakdown = calculatePriorityBreakdown(CANONICAL_INPUT);
  // Locks weights at: interest 0.45, segment 0.25, change 0.15, recency 0.15
  // TRIAL=0.8, PHONE_CHANGED=0.75
  assert.equal(Number(breakdown.interestContribution.toFixed(6)), 0.378);
  assert.equal(Number(breakdown.segmentContribution.toFixed(6)), 0.2);
  assert.equal(Number(breakdown.changeTypeContribution.toFixed(6)), 0.1125);
  assert.equal(Number(breakdown.recencyContribution.toFixed(6)), 0.105);
  assert.equal(Number(breakdown.totalScore.toFixed(6)), 0.7955);
});

test("scoring is independent of call order across segments", () => {
  const segments: Segment[] = ["FREE", "TRIAL", "LAPSED", "ACTIVE"];
  const baseline = segments.map((segment) =>
    calculatePriorityScore({ ...CANONICAL_INPUT, segment })
  );

  // Re-run in reverse with arbitrary intervening calls — results must not drift.
  const interleaved = [...segments].reverse().map((segment, idx) => {
    calculatePriorityScore({ ...CANONICAL_INPUT, interestScore: idx * 0.13 });
    return calculatePriorityScore({ ...CANONICAL_INPUT, segment });
  });

  assert.deepEqual(interleaved.reverse(), baseline);
});

test("increasing interestScore monotonically increases totalScore", () => {
  const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map((interestScore) =>
    calculatePriorityScore({ ...CANONICAL_INPUT, interestScore })
  );

  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i] > samples[i - 1], `score should grow with interestScore at index ${i}`);
  }
});

test("increasing recencyScore monotonically increases totalScore", () => {
  const samples = [0, 0.25, 0.5, 0.75, 1].map((recencyScore) =>
    calculatePriorityScore({ ...CANONICAL_INPUT, recencyScore })
  );

  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i] > samples[i - 1], `score should grow with recencyScore at index ${i}`);
  }
});

test("segment ordering is preserved: LAPSED > TRIAL > FREE > ACTIVE", () => {
  const score = (segment: Segment) =>
    calculatePriorityScore({ ...CANONICAL_INPUT, segment });

  assert.ok(score("LAPSED") > score("TRIAL"));
  assert.ok(score("TRIAL") > score("FREE"));
  assert.ok(score("FREE") > score("ACTIVE"));
});

test("changeType ordering is preserved: LEGAL_RECORD_ADDED is highest, ASSOCIATE_ADDED is lowest", () => {
  const allTypes: ChangeType[] = [
    "ADDRESS_CHANGE",
    "PHONE_ADDED",
    "PHONE_CHANGED",
    "EMAIL_ADDED",
    "ASSOCIATE_ADDED",
    "EMPLOYEE_RECORD_ADDED",
    "OTHER_RECORD_ADDED",
    "LEGAL_RECORD_ADDED"
  ];

  const scored = allTypes.map((changeType) => ({
    changeType,
    score: calculatePriorityScore({ ...CANONICAL_INPUT, changeType })
  }));

  scored.sort((a, b) => b.score - a.score);
  assert.equal(scored[0].changeType, "LEGAL_RECORD_ADDED");
  assert.equal(scored[scored.length - 1].changeType, "ASSOCIATE_ADDED");
});

test("breakdown contributions always sum to totalScore for any valid input", () => {
  const segments: Segment[] = ["FREE", "TRIAL", "LAPSED", "ACTIVE"];
  const changeTypes: ChangeType[] = [
    "ADDRESS_CHANGE",
    "PHONE_ADDED",
    "PHONE_CHANGED",
    "EMAIL_ADDED",
    "ASSOCIATE_ADDED",
    "EMPLOYEE_RECORD_ADDED",
    "OTHER_RECORD_ADDED",
    "LEGAL_RECORD_ADDED"
  ];

  for (const segment of segments) {
    for (const changeType of changeTypes) {
      for (const interestScore of [0, 0.5, 1]) {
        for (const recencyScore of [0, 0.5, 1]) {
          const breakdown = calculatePriorityBreakdown({
            interestScore,
            segment,
            changeType,
            recencyScore
          });
          const summed =
            breakdown.interestContribution +
            breakdown.segmentContribution +
            breakdown.changeTypeContribution +
            breakdown.recencyContribution;

          assert.equal(
            Number(summed.toFixed(10)),
            Number(breakdown.totalScore.toFixed(10)),
            `sum mismatch for ${segment}/${changeType}/i=${interestScore}/r=${recencyScore}`
          );
        }
      }
    }
  }
});

test("zero inputs produce zero contribution from interest and recency channels", () => {
  const breakdown = calculatePriorityBreakdown({
    interestScore: 0,
    segment: "ACTIVE",
    changeType: "ASSOCIATE_ADDED",
    recencyScore: 0
  });

  assert.equal(breakdown.interestContribution, 0);
  assert.equal(breakdown.recencyContribution, 0);
  assert.ok(breakdown.segmentContribution > 0);
  assert.ok(breakdown.changeTypeContribution > 0);
});
