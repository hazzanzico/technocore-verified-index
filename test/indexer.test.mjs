import test from "node:test";
import assert from "node:assert/strict";
import { GitHubApiError } from "../src/github.mjs";
import { buildReport, inspectProject, validateReport } from "../src/indexer.mjs";

const NOW = new Date("2026-08-26T12:00:00Z");
const project = {
  repo: "owner/project",
  category: "testing",
  summary: "A complete project used for deterministic index tests.",
  platforms: ["node"],
  tags: ["testing"],
  evidence: { protocol_path: "test/protocol.test.mjs" },
};

function successfulClient({ optionalFailure = null } = {}) {
  return {
    async get(path) {
      if (optionalFailure && path.includes(optionalFailure)) throw new GitHubApiError("timeout", 0);
      if (path.endsWith("/owner/project")) {
        return {
          archived: false,
          license: { spdx_id: "MIT" },
          pushed_at: "2026-08-25T00:00:00Z",
          default_branch: "main/edge",
          stargazers_count: 3,
          forks_count: 2,
        };
      }
      if (path.includes("/git/trees/")) {
        assert.match(path, /main%2Fedge/);
        return { tree: [
          { type: "blob", path: "LICENSE" },
          { type: "blob", path: "README.md" },
          { type: "blob", path: "SECURITY.md" },
          { type: "blob", path: "test/protocol.test.mjs" },
          { type: "blob", path: ".github/workflows/ci.yml" },
          { type: "tree", path: "ignored" },
        ] };
      }
      if (path.includes("/actions/runs")) return { workflow_runs: [{ conclusion: "success", html_url: "https://github.com/owner/project/actions/runs/1" }] };
      if (path.includes("/releases/latest")) return { tag_name: "v1.0.0", html_url: "https://github.com/owner/project/releases/tag/v1.0.0" };
      if (path.includes("/tags")) return [{ name: "v1.0.0" }];
      throw new Error(`unexpected ${path}`);
    },
  };
}

test("inspects repository facts, exact evidence paths, and complete coverage", async () => {
  const result = await inspectProject(project, successfulClient(), NOW);
  assert.equal(result.coverage.percentage, 100);
  assert.equal(result.coverage.label, "complete");
  assert.deepEqual(result.observation.files, { readme: true, tests: true, security: true, protocol_evidence: true });
  assert.deepEqual(result.observation.evidence_paths, {
    license: "LICENSE",
    readme: "README.md",
    tests: "test/protocol.test.mjs",
    security: "SECURITY.md",
    protocol: "test/protocol.test.mjs",
  });
  assert.deepEqual(result.observation.version, {
    release: "v1.0.0",
    release_url: "https://github.com/owner/project/releases/tag/v1.0.0",
    tag: "v1.0.0",
  });
  assert.equal(result.observation.automation.present, true);
});

test("an unavailable repository becomes an unavailable observation", async () => {
  const client = { get: async () => { throw new GitHubApiError("not_found", 404); } };
  const result = await inspectProject(project, client, NOW);
  assert.equal(result.observation.available, false);
  assert.equal(result.observation.error, "not_found");
  assert.equal(result.coverage.percentage, null);
  assert.equal(result.coverage.label, "unavailable");
});

test("unexpected repository failures do not leak diagnostics", async () => {
  const result = await inspectProject(project, { get: async () => { throw new Error("secret detail"); } }, NOW);
  assert.equal(result.observation.error, "unexpected_error");
  assert.equal(JSON.stringify(result).includes("secret detail"), false);
});

test("optional endpoint failures preserve facts and mark the signal unavailable", async () => {
  const result = await inspectProject(project, successfulClient({ optionalFailure: "/actions/runs" }), NOW);
  assert.equal(result.observation.available, true);
  assert.deepEqual(result.observation.warnings, ["actions:timeout"]);
  assert.equal(result.coverage.percentage, 90);
  assert.equal(result.coverage.label, "incomplete");
  assert.equal(result.coverage.checks.find((check) => check.id === "ci").state, "unavailable");
});

test("malformed tree data is unavailable rather than missing evidence", async () => {
  const client = {
    async get(path) {
      if (path.endsWith("/owner/project")) return { archived: true, license: { spdx_id: "NOASSERTION" }, default_branch: null };
      if (path.includes("trees")) return { tree: "invalid" };
      if (path.includes("actions")) return { workflow_runs: [] };
      if (path.includes("releases")) return null;
      if (path.includes("tags")) return [];
      throw new Error("unexpected path");
    },
  };
  const result = await inspectProject(project, client, NOW);
  assert.equal(result.observation.default_branch, null);
  assert.equal(result.observation.license, null);
  assert.deepEqual(result.observation.version, { release: null, release_url: null, tag: null });
  assert.ok(result.observation.warnings.includes("tree:invalid_response"));
  assert.equal(result.coverage.label, "incomplete");
  assert.equal(result.coverage.checks.find((check) => check.id === "readme").state, "unavailable");
});

test("builds a sorted v2 report with bounded concurrency", async () => {
  const catalog = { projects: [{ ...project, repo: "z/z" }, { ...project, repo: "a/a" }] };
  const client = {
    async get(path) {
      if (/\/repos\/(z\/z|a\/a)$/.test(path)) return { archived: false, license: null, default_branch: "main" };
      if (path.includes("trees")) return { tree: [] };
      if (path.includes("actions")) return { workflow_runs: [] };
      if (path.includes("releases")) return null;
      if (path.includes("tags")) return [];
      throw new Error(path);
    },
  };
  const report = await buildReport(catalog, client, { now: NOW, concurrency: 2 });
  assert.deepEqual(report.projects.map((item) => item.repo), ["a/a", "z/z"]);
  assert.equal(report.schema, "technocore-verified-index-report-v2");
  assert.equal(report.methodology_version, "2.0.0");
  assert.deepEqual(validateReport(report), report);
});

test("migrates v1 reports and rejects invalid v2 report shapes", async () => {
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { now: new Date("bad") }), /now/);
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { concurrency: 0 }), /concurrency/);
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { concurrency: 11 }), /concurrency/);
  assert.throws(() => validateReport(null), /object/);
  assert.throws(() => validateReport({ schema: "future" }), /schema/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v2", generated_at: NOW.toISOString(), project_count: 1, projects: [] }), /count/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v2", generated_at: "bad", project_count: 0, projects: [] }), /generated_at/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v2", generated_at: NOW.toISOString(), project_count: 1, projects: [{}] }), /invalid project/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v2", generated_at: NOW.toISOString(), project_count: 1, projects: [{ repo: "x/x", observation: {}, coverage: { percentage: 101, label: "complete", checks: [], total: 0 } }] }), /invalid evidence coverage/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v2", generated_at: NOW.toISOString(), project_count: 1, projects: [{ repo: "x/x", observation: {}, coverage: { percentage: 10, label: "limited", checks: [], total: 10 } }] }), /inconsistent evidence checks/);

  const legacy = validateReport({
    schema: "technocore-verified-index-report-v1",
    methodology_version: "1.0.0",
    generated_at: NOW.toISOString(),
    project_count: 1,
    projects: [{ ...project, observation: {}, readiness: { score: 15, grade: "D", checks: [{ id: "accessible", passed: true }] } }],
  });
  assert.equal(legacy.schema, "technocore-verified-index-report-v2");
  assert.equal(legacy.projects[0].coverage.percentage, 10);
  assert.equal("readiness" in legacy.projects[0], false);
});
