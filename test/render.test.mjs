import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  escapeMarkdown,
  renderDetailedReport,
  renderHtml,
  renderReadme,
  scoreRuleTotal,
  serializeReport,
} from "../src/render.mjs";
import { scoreObservation } from "../src/score.mjs";

const observation = {
  available: true,
  archived: false,
  license: "MIT",
  pushed_at: "2026-08-25T00:00:00Z",
  default_branch: "main",
  stars: 1,
  forks: 0,
  files: { readme: true, tests: true, security: false, protocol_evidence: false },
  automation: { present: true, conclusion: "success", url: "https://github.com/owner/project/actions/runs/1" },
  version: { release: null, tag: "v1" },
  warnings: [],
};
const project = {
  repo: "owner/project",
  category: "automation",
  summary: "Useful <script>alert(1)</script> project | safely rendered.",
  platforms: ["node"],
  tags: ["ci", "signing"],
  observation,
  readiness: scoreObservation(observation, new Date("2026-08-26T00:00:00Z")),
};
const report = {
  schema: "technocore-verified-index-report-v1",
  methodology_version: "1.0.0",
  generated_at: "2026-08-26T00:00:00.000Z",
  project_count: 1,
  projects: [project],
};

test("escapes HTML and Markdown metacharacters", () => {
  assert.equal(escapeHtml(`<a href='x'>&"</a>`), "&lt;a href=&#39;x&#39;&gt;&amp;&quot;&lt;/a&gt;");
  assert.equal(escapeMarkdown("a|b<c>\\d"), "a\\|b&lt;c&gt;\\\\d");
});

test("renders an evidence-first README without interpreting descriptions", () => {
  const output = renderReadme(report);
  assert.match(output, /Evidence over hype|What makes this different|owner\/project/);
  assert.match(output, /https:\/\/hazzanzico\.github\.io\/technocore-verified-index\//);
  assert.match(output, /sequence `249529`|PROVENANCE\.md/);
  assert.match(output, /Useful &lt;script&gt;alert\(1\)&lt;\/script&gt; project \\| safely rendered/);
  assert.doesNotMatch(output, /<script>alert/);
});

test("renders a detailed report with safe workflow links and missing values", () => {
  const output = renderDetailedReport(report);
  assert.match(output, /\[success\]\(https:\/\/github\.com\/owner\/project\/actions\/runs\/1\)/);
  assert.match(output, /Latest release: not observed/);
  const unsafe = structuredClone(report);
  unsafe.projects[0].observation.automation.url = "https://example.com/run";
  unsafe.projects[0].observation.warnings = ["tree:timeout"];
  const safeOutput = renderDetailedReport(unsafe);
  assert.doesNotMatch(safeOutput, /example\.com/);
  assert.match(safeOutput, /tree:timeout/);
});

test("renders a searchable, CSP-constrained static page", () => {
  const output = renderHtml(report);
  assert.match(output, /Content-Security-Policy/);
  assert.match(output, /data-search=/);
  assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal((output.match(/<script>/g) ?? []).length, 1);
});

test("renders limited evidence text and unknown categories defensively", () => {
  const limited = structuredClone(report);
  limited.projects[0].category = "future-category";
  limited.projects[0].readiness.checks = limited.projects[0].readiness.checks.map((check) => ({ ...check, passed: false, awarded: 0 }));
  assert.match(renderReadme(limited), /limited evidence/);
  assert.match(renderReadme(limited), /future-category/);
});

test("renders unavailable repositories as unscored", () => {
  const unavailable = structuredClone(report);
  unavailable.projects[0].observation.available = false;
  unavailable.projects[0].readiness.score = null;
  unavailable.projects[0].readiness.grade = "U";
  assert.match(renderReadme(unavailable), /\| U \| unscored \|/);
  assert.match(renderHtml(unavailable), /grade-u[^>]*><strong>—<\/strong>/);
});

test("serializes deterministic report JSON and retains a 100-point rubric", () => {
  assert.equal(JSON.parse(serializeReport(report)).project_count, 1);
  assert.ok(serializeReport(report).endsWith("\n"));
  assert.equal(scoreRuleTotal(), 100);
});
