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
          { type: "blob", path: "README.md" },
          { type: "blob", path: "SECURITY.md" },
          { type: "blob", path: "test/protocol.test.mjs" },
          { type: "blob", path: ".github/workflows/ci.yml" },
          { type: "tree", path: "ignored" },
        ] };
      }
      if (path.includes("/actions/runs")) return { workflow_runs: [{ conclusion: "success", html_url: "https://github.com/owner/project/actions/runs/1" }] };
      if (path.includes("/releases/latest")) return { tag_name: "v1.0.0" };
      if (path.includes("/tags")) return [{ name: "v1.0.0" }];
      throw new Error(`unexpected ${path}`);
    },
  };
}

test("inspects repository facts and scores a complete project", async () => {
  const result = await inspectProject(project, successfulClient(), NOW);
  assert.equal(result.readiness.score, 100);
  assert.deepEqual(result.observation.files, {
    readme: true,
    tests: true,
    security: true,
    protocol_evidence: true,
  });
  assert.deepEqual(result.observation.version, { release: "v1.0.0", tag: "v1.0.0" });
  assert.equal(result.observation.automation.present, true);
});

test("an unavailable repository becomes an observation, not an exception", async () => {
  const client = { get: async () => { throw new GitHubApiError("not_found", 404); } };
  const result = await inspectProject(project, client, NOW);
  assert.equal(result.observation.available, false);
  assert.equal(result.observation.error, "not_found");
  assert.equal(result.readiness.score, null);
  assert.equal(result.readiness.grade, "U");
});

test("unexpected repository failures are reduced to a safe category", async () => {
  const result = await inspectProject(project, { get: async () => { throw new Error("secret detail"); } }, NOW);
  assert.equal(result.observation.error, "unexpected_error");
  assert.equal(JSON.stringify(result).includes("secret detail"), false);
});

test("optional endpoint failures preserve available metadata and warnings", async () => {
  const result = await inspectProject(project, successfulClient({ optionalFailure: "/actions/runs" }), NOW);
  assert.equal(result.observation.available, true);
  assert.deepEqual(result.observation.warnings, ["actions:timeout"]);
  assert.equal(result.observation.automation.conclusion, null);
  assert.equal(result.readiness.score, 85);
});

test("missing optional facts and malformed tree shapes stay unobserved", async () => {
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
  assert.deepEqual(result.observation.version, { release: null, tag: null });
  assert.equal(result.readiness.score, 15);
});

test("builds a sorted report with bounded concurrency", async () => {
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
  assert.equal(report.project_count, 2);
  assert.equal(validateReport(report), report);
});

test("rejects invalid report construction and report shapes", async () => {
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { now: new Date("bad") }), /now/);
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { concurrency: 0 }), /concurrency/);
  await assert.rejects(buildReport({ projects: [project] }, successfulClient(), { concurrency: 11 }), /concurrency/);
  assert.throws(() => validateReport(null), /object/);
  assert.throws(() => validateReport({ schema: "future" }), /schema/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v1", generated_at: NOW.toISOString(), project_count: 1, projects: [] }), /count/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v1", generated_at: "bad", project_count: 0, projects: [] }), /generated_at/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v1", generated_at: NOW.toISOString(), project_count: 1, projects: [{}] }), /invalid project/);
  assert.throws(() => validateReport({ schema: "technocore-verified-index-report-v1", generated_at: NOW.toISOString(), project_count: 1, projects: [{ repo: "x/x", observation: {}, readiness: { score: 101 } }] }), /invalid score/);
});
