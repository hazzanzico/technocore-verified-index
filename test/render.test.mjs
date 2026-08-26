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
  evidence_paths: { license: "LICENSE", readme: "README.md", tests: "test/main.test.mjs", security: null, protocol: null },
  automation: { present: true, conclusion: "success", url: "https://github.com/owner/project/actions/runs/1" },
  version: { release: null, release_url: null, tag: "v1" },
  warnings: [],
};
const project = {
  repo: "owner/project",
  category: "automation",
  summary: "Useful <script>alert(1)</script> project | safely rendered.",
  platforms: ["node"],
  tags: ["ci", "signing"],
  evidence: { protocol_path: "src/protocol.mjs" },
  observation,
  coverage: scoreObservation(observation, new Date("2026-08-26T00:00:00Z")),
};
const report = {
  schema: "technocore-verified-index-report-v2",
  methodology_version: "2.0.0",
  generated_at: "2026-08-26T00:00:00.000Z",
  project_count: 1,
  projects: [project],
};

test("escapes HTML and Markdown metacharacters", () => {
  assert.equal(escapeHtml(`<a href='x'>&"</a>`), "&lt;a href=&#39;x&#39;&gt;&amp;&quot;&lt;/a&gt;");
  assert.equal(escapeMarkdown("a|b<c>\\d"), "a\\|b&lt;c&gt;\\\\d");
});

test("renders neutral evidence language in the README", () => {
  const output = renderReadme(report);
  assert.match(output, /Observable Evidence|evidence coverage|all ten measured signals/i);
  assert.match(output, /https:\/\/hazzanzico\.github\.io\/technocore-verified-index\//);
  assert.match(output, /sequence `249529`|PROVENANCE\.md/);
  assert.match(output, /Useful &lt;script&gt;alert\(1\)&lt;\/script&gt; project \\| safely rendered/);
  assert.doesNotMatch(output, /<script>alert|\| Grade \|/);
});

test("renders detailed evidence with bounded GitHub links", () => {
  const output = renderDetailedReport(report);
  assert.match(output, /\[Latest automation passed\]\(https:\/\/github\.com\/owner\/project\/actions\/runs\/1\)/);
  assert.match(output, /blob\/main\/README\.md/);
  assert.match(output, /Latest release: not observed/);
  const unsafe = structuredClone(report);
  unsafe.projects[0].observation.automation.url = "https://example.com/run";
  unsafe.projects[0].observation.warnings = ["tree:timeout"];
  const safeOutput = renderDetailedReport(unsafe);
  assert.doesNotMatch(safeOutput, /example\.com/);
  assert.match(safeOutput, /tree:timeout/);
});

test("renders a progressive, CSP-constrained dashboard", () => {
  const output = renderHtml(report);
  assert.match(output, /Content-Security-Policy/);
  assert.match(output, /style-src &#39;self&#39;|style-src 'self'/);
  assert.match(output, /src="\.\/app\.mjs"/);
  assert.match(output, /href="\.\/styles\.css"/);
  assert.match(output, /id="project-cards"|data-project-card/);
  assert.match(output, /id="project-table-wrap"/);
  assert.match(output, /id="comparison"/);
  assert.match(output, /id="coverage"|id="platform"|id="signal"/);
  assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(output, /<style>|<script>[^<]/);
});

test("renders the compact repository-first interface", () => {
  const output = renderHtml(report);
  assert.match(output, /Technocore repositories/);
  assert.match(output, /Community-maintained evidence index/);
  assert.match(output, /class="project-card"/);
  assert.match(output, /class="card-main"/);
  assert.match(output, /class="coverage-score"/);
  assert.match(output, /data-details-template/);
  assert.match(output, /detailed report/);
  assert.match(output, />List<\/button>/);
  assert.doesNotMatch(output, /See what the ecosystem can show/);
});

test("renders history changes and chart readiness honestly", () => {
  const previous = structuredClone(report);
  previous.generated_at = "2026-08-25T00:00:00.000Z";
  previous.projects[0].coverage.percentage = 60;
  previous.projects[0].coverage.label = "partial";
  previous.projects[0].coverage.checks[0].state = "missing";
  const output = renderHtml(report, [previous]);
  assert.match(output, /percentage points|signal changes/);
  assert.match(output, /trend-line|daily snapshots/);
});

test("renders unknown categories and unavailable repositories defensively", () => {
  const unavailable = structuredClone(report);
  unavailable.projects[0].category = "future-category";
  unavailable.projects[0].observation.available = false;
  unavailable.projects[0].coverage = {
    percentage: null,
    label: "unavailable",
    present: 0,
    observed: 0,
    total: 10,
    checks: unavailable.projects[0].coverage.checks.map((check) => ({ ...check, state: "unavailable", passed: false, awarded: 0 })),
  };
  assert.match(renderReadme(unavailable), /future-category/);
  assert.match(renderReadme(unavailable), /Unavailable \| unavailable/);
  assert.match(renderHtml(unavailable), /pill-unavailable|—/);
});

test("serializes deterministic v2 JSON and retains a 100-percent rubric", () => {
  assert.equal(JSON.parse(serializeReport(report)).schema, "technocore-verified-index-report-v2");
  assert.ok(serializeReport(report).endsWith("\n"));
  assert.equal(scoreRuleTotal(), 100);
});
