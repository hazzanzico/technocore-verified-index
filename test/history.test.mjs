import test from "node:test";
import assert from "node:assert/strict";
import { summarizeHistory } from "../src/history.mjs";
import { scoreObservation } from "../src/score.mjs";

function report(date, percentageChange = null) {
  const observation = {
    available: true,
    archived: false,
    license: "MIT",
    pushed_at: `${date}T00:00:00Z`,
    files: { readme: true, tests: true, security: true, protocol_evidence: true },
    automation: { conclusion: "success" },
    version: { release: "v1", tag: "v1" },
    warnings: [],
  };
  const coverage = scoreObservation(observation, new Date(`${date}T12:00:00Z`));
  if (percentageChange !== null) {
    coverage.checks.at(-1).state = "missing";
    coverage.checks.at(-1).passed = false;
    coverage.checks.at(-1).awarded = 0;
    coverage.percentage = percentageChange;
    coverage.present = percentageChange / 10;
    coverage.label = "strong";
  }
  return {
    generated_at: `${date}T12:00:00Z`,
    projects: [{ repo: "owner/project", coverage }],
  };
}

test("deduplicates daily snapshots and builds deterministic trends", () => {
  const older = report("2026-08-24", 90);
  const sameDayOld = report("2026-08-25", 90);
  const current = report("2026-08-25");
  const summary = summarizeHistory(current, [older, sameDayOld]);
  assert.equal(summary.snapshot_count, 2);
  assert.deepEqual(summary.trends["owner/project"].map((point) => point.date), ["2026-08-24", "2026-08-25"]);
  assert.equal(summary.changes[0].delta, 10);
});

test("reports a baseline without inventing changes", () => {
  const current = report("2026-08-25");
  const summary = summarizeHistory(current, []);
  assert.equal(summary.snapshot_count, 1);
  assert.equal(summary.previous_date, null);
  assert.deepEqual(summary.changes, []);
});
