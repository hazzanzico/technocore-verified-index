import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STATE,
  filterProjects,
  parseUrlState,
  serializeUrlState,
  sortProjects,
  toggleComparison,
} from "../site/ui-state.mjs";

const projects = [
  { repo: "zeta/tool", search: "zeta tool python testing", category: "testing", coverage: "strong", percentage: 80, platforms: ["python"], checks: { tests: "present", ci: "missing" }, pushedAt: "2026-08-20T00:00:00Z" },
  { repo: "alpha/sdk", search: "alpha sdk node signing", category: "clients", coverage: "complete", percentage: 100, platforms: ["node"], checks: { tests: "present", ci: "present" }, pushedAt: "2026-08-25T00:00:00Z" },
  { repo: "beta/app", search: "beta app windows dashboard", category: "applications", coverage: "partial", percentage: 60, platforms: ["windows"], checks: { tests: "missing", ci: "missing" }, pushedAt: null },
];

test("parses bounded shareable state and rejects invalid values", () => {
  const state = parseUrlState("?q=sdk&category=clients&coverage=complete&platform=node&signal=ci&sort=coverage&view=table&compare=alpha/sdk,zeta/tool,bad,alpha/sdk");
  assert.deepEqual(state, {
    query: "sdk",
    category: "clients",
    coverage: "complete",
    platform: "node",
    signal: "ci",
    sort: "coverage",
    view: "table",
    compare: ["alpha/sdk", "zeta/tool"],
  });
  assert.deepEqual(parseUrlState("?coverage=A&sort=bad&view=bad"), DEFAULT_STATE);
});

test("serializes only non-default state", () => {
  assert.equal(serializeUrlState(DEFAULT_STATE).toString(), "");
  const query = serializeUrlState({ ...DEFAULT_STATE, query: "signed action", view: "table", compare: ["alpha/sdk"] }).toString();
  assert.equal(query, "q=signed+action&view=table&compare=alpha%2Fsdk");
});

test("filters by query, category, coverage, platform, and present signal", () => {
  assert.deepEqual(filterProjects(projects, { ...DEFAULT_STATE, query: "sdk" }).map((project) => project.repo), ["alpha/sdk"]);
  assert.deepEqual(filterProjects(projects, { ...DEFAULT_STATE, category: "testing", platform: "python", coverage: "strong", signal: "tests" }).map((project) => project.repo), ["zeta/tool"]);
  assert.deepEqual(filterProjects(projects, { ...DEFAULT_STATE, signal: "ci" }).map((project) => project.repo), ["alpha/sdk"]);
});

test("sorts deterministically without mutating source projects", () => {
  assert.deepEqual(sortProjects(projects).map((project) => project.repo), ["alpha/sdk", "beta/app", "zeta/tool"]);
  assert.deepEqual(sortProjects(projects, "coverage").map((project) => project.repo), ["alpha/sdk", "zeta/tool", "beta/app"]);
  assert.deepEqual(sortProjects(projects, "recent").map((project) => project.repo), ["alpha/sdk", "zeta/tool", "beta/app"]);
  assert.equal(projects[0].repo, "zeta/tool");
});

test("comparison selection is unique, reversible, and limited to three", () => {
  assert.deepEqual(toggleComparison([], "alpha/sdk"), ["alpha/sdk"]);
  assert.deepEqual(toggleComparison(["alpha/sdk"], "alpha/sdk"), []);
  assert.deepEqual(toggleComparison(["alpha/sdk", "zeta/tool", "beta/app"], "gamma/new"), ["alpha/sdk", "zeta/tool", "beta/app"]);
  assert.deepEqual(toggleComparison([], "not-a-repo"), []);
});
