import test from "node:test";
import assert from "node:assert/strict";
import {
  coverageFromLegacy,
  labelForCoverage,
  SCORE_RULES,
  scoreObservation,
} from "../src/score.mjs";

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
    warnings: [],
    ...change,
  };
}

test("ten equal public signals produce complete evidence coverage", () => {
  assert.equal(SCORE_RULES.length, 10);
  assert.ok(SCORE_RULES.every((rule) => rule.points === 10));
  const result = scoreObservation(completeObservation(), NOW);
  assert.deepEqual(
    { percentage: result.percentage, label: result.label, present: result.present, observed: result.observed },
    { percentage: 100, label: "complete", present: 10, observed: 10 },
  );
});

test("each missing signal changes coverage by exactly ten percentage points", () => {
  const result = scoreObservation(
    completeObservation({
      archived: true,
      license: null,
      pushed_at: "2025-01-01T00:00:00Z",
      files: { readme: false, tests: false, security: false, protocol_evidence: false },
      automation: { conclusion: "failure" },
      version: { release: null, tag: null },
    }),
    NOW,
  );
  assert.equal(result.percentage, 10);
  assert.equal(result.label, "limited");
  assert.equal(result.checks.find((check) => check.id === "accessible").state, "present");
  assert.ok(result.checks.filter((check) => check.id !== "accessible").every((check) => check.state === "missing" && check.awarded === 0));
});

test("repository and optional-source outages are explicit rather than failures", () => {
  const unavailable = scoreObservation(completeObservation({ available: false }), NOW);
  assert.equal(unavailable.percentage, null);
  assert.equal(unavailable.label, "unavailable");
  assert.ok(unavailable.checks.every((check) => check.state === "unavailable"));

  const partialObservation = scoreObservation(
    completeObservation({ warnings: ["tree:timeout", "actions:timeout"] }),
    NOW,
  );
  assert.equal(partialObservation.label, "incomplete");
  assert.equal(partialObservation.observed, 5);
  assert.equal(partialObservation.checks.find((check) => check.id === "tests").state, "unavailable");
  assert.equal(partialObservation.checks.find((check) => check.id === "ci").state, "unavailable");
});

test("tag-only versioning and the recent boundary are observable", () => {
  const atBoundary = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const result = scoreObservation(
    completeObservation({ pushed_at: atBoundary, version: { release: null, tag: "initial" } }),
    NOW,
  );
  assert.equal(result.percentage, 100);
});

test("future and invalid push dates are not treated as recent", () => {
  assert.equal(scoreObservation(completeObservation({ pushed_at: "2027-01-01T00:00:00Z" }), NOW).percentage, 90);
  assert.equal(scoreObservation(completeObservation({ pushed_at: "invalid" }), NOW).percentage, 90);
});

test("descriptive coverage labels have stable, non-grade boundaries", () => {
  assert.equal(labelForCoverage(100), "complete");
  assert.equal(labelForCoverage(90), "strong");
  assert.equal(labelForCoverage(70), "strong");
  assert.equal(labelForCoverage(60), "partial");
  assert.equal(labelForCoverage(40), "partial");
  assert.equal(labelForCoverage(30), "limited");
  assert.equal(labelForCoverage(100, 1), "incomplete");
  assert.equal(labelForCoverage(null), "unavailable");
});

test("v1 readiness data migrates to equal-signal v2 coverage", () => {
  const legacy = coverageFromLegacy({
    score: 75,
    grade: "B",
    checks: SCORE_RULES.map((rule, index) => ({ id: rule.id, passed: index < 8 })),
  });
  assert.equal(legacy.percentage, 80);
  assert.equal(legacy.label, "strong");
  assert.equal(legacy.present, 8);

  const unavailable = coverageFromLegacy({ score: null, grade: "U", checks: [] });
  assert.equal(unavailable.percentage, null);
  assert.equal(unavailable.label, "unavailable");
  assert.ok(unavailable.checks.every((check) => check.state === "unavailable"));
});
