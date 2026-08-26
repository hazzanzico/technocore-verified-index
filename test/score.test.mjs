import test from "node:test";
import assert from "node:assert/strict";
import { gradeForScore, SCORE_RULES, scoreObservation } from "../src/score.mjs";

const NOW = new Date("2026-08-26T12:00:00Z");

function completeObservation(change = {}) {
  return {
    available: true,
    archived: false,
    license: "MIT",
    pushed_at: "2026-08-25T12:00:00Z",
    files: { readme: true, tests: true, security: true, protocol_evidence: true },
    automation: { conclusion: "success" },
    version: { release: "v1.0.0", tag: "v1.0.0" },
    ...change,
  };
}

test("the public rubric totals 100 and a complete observation earns it", () => {
  assert.equal(SCORE_RULES.reduce((sum, rule) => sum + rule.points, 0), 100);
  assert.deepEqual(scoreObservation(completeObservation(), NOW).score, 100);
});

test("each absent signal loses only its documented points for an available repository", () => {
  const result = scoreObservation(
    completeObservation({
      available: true,
      archived: true,
      license: null,
      pushed_at: "2025-01-01T00:00:00Z",
      files: { readme: false, tests: false, security: false, protocol_evidence: false },
      automation: { conclusion: "failure" },
      version: { release: null, tag: null },
    }),
    NOW,
  );
  assert.equal(result.score, 15);
  assert.equal(result.checks.find((check) => check.id === "accessible").passed, true);
  assert.ok(result.checks.filter((check) => check.id !== "accessible").every((check) => !check.passed && check.awarded === 0));
});

test("an unavailable repository is unscored rather than graded as failing", () => {
  const result = scoreObservation(completeObservation({ available: false }), NOW);
  assert.equal(result.score, null);
  assert.equal(result.grade, "U");
});

test("tag-only versioning and recent boundary are accepted", () => {
  const atBoundary = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const result = scoreObservation(
    completeObservation({ pushed_at: atBoundary, version: { release: null, tag: "initial" } }),
    NOW,
  );
  assert.equal(result.score, 100);
});

test("future and invalid push dates are not treated as recent", () => {
  assert.equal(
    scoreObservation(completeObservation({ pushed_at: "2027-01-01T00:00:00Z" }), NOW).score,
    95,
  );
  assert.equal(scoreObservation(completeObservation({ pushed_at: "invalid" }), NOW).score, 95);
});

test("grade boundaries remain stable", () => {
  assert.equal(gradeForScore(100), "A");
  assert.equal(gradeForScore(85), "A");
  assert.equal(gradeForScore(84), "B");
  assert.equal(gradeForScore(70), "B");
  assert.equal(gradeForScore(69), "C");
  assert.equal(gradeForScore(50), "C");
  assert.equal(gradeForScore(49), "D");
});
