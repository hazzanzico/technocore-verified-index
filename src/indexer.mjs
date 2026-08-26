import { GitHubApiError, repositoryApiPath } from "./github.mjs";
import { coverageFromLegacy, labelForCoverage, SCORE_RULES, scoreObservation } from "./score.mjs";

const README_PATTERN = /^readme(?:\.[^/]+)?$/i;
const TEST_PATTERN = /(^|\/)(?:test|tests|spec|specs)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i;
const WORKFLOW_PATTERN = /^\.github\/workflows\/[^/]+\.ya?ml$/i;
const LICENSE_PATTERN = /^(?:licen[cs]e|copying)(?:\.[^/]+)?$/i;

function pathsFromTree(tree) {
  if (!tree || !Array.isArray(tree.tree)) return null;
  return tree.tree
    .filter((entry) => entry?.type === "blob" && typeof entry.path === "string")
    .map((entry) => entry.path);
}

async function optional(call, errorName, warnings) {
  try {
    return await call();
  } catch (error) {
    warnings.push(error instanceof GitHubApiError ? `${errorName}:${error.code}` : errorName);
    return null;
  }
}

export async function inspectProject(project, client, now = new Date()) {
  const warnings = [];
  let metadata;
  try {
    metadata = await client.get(repositoryApiPath(project.repo));
  } catch (error) {
    const code = error instanceof GitHubApiError ? error.code : "unexpected_error";
    const observation = {
      available: false,
      error: code,
      archived: null,
      license: null,
      pushed_at: null,
      default_branch: null,
      stars: null,
      forks: null,
      files: { readme: null, tests: null, security: null, protocol_evidence: null },
      evidence_paths: { license: null, readme: null, tests: null, security: null, protocol: null },
      automation: { present: false, conclusion: null, url: null },
      version: { release: null, tag: null },
      warnings: [],
    };
    return { ...project, observation, coverage: scoreObservation(observation, now) };
  }

  const branch = encodeURIComponent(metadata.default_branch || "main");
  const base = repositoryApiPath(project.repo);
  const [tree, runs, release, tags] = await Promise.all([
    optional(() => client.get(`${base}/git/trees/${branch}?recursive=1`), "tree", warnings),
    optional(
      () => client.get(`${base}/actions/runs?status=completed&per_page=1`),
      "actions",
      warnings,
    ),
    optional(() => client.get(`${base}/releases/latest`, { allow404: true }), "release", warnings),
    optional(() => client.get(`${base}/tags?per_page=1`), "tags", warnings),
  ]);
  const treePaths = pathsFromTree(tree);
  if (tree !== null && treePaths === null) warnings.push("tree:invalid_response");
  const paths = treePaths?.sort((left, right) => left.localeCompare(right)) ?? null;
  const lowerPaths = new Set((paths ?? []).map((path) => path.toLowerCase()));
  const latestRun = Array.isArray(runs?.workflow_runs) ? runs.workflow_runs[0] : null;
  const protocolPath = project.evidence?.protocol_path;
  const observation = {
    available: true,
    error: null,
    archived: metadata.archived === true,
    license:
      metadata.license?.spdx_id && metadata.license.spdx_id !== "NOASSERTION"
        ? metadata.license.spdx_id
        : null,
    pushed_at: typeof metadata.pushed_at === "string" ? metadata.pushed_at : null,
    default_branch:
      typeof metadata.default_branch === "string" ? metadata.default_branch : null,
    stars: Number.isInteger(metadata.stargazers_count) ? metadata.stargazers_count : null,
    forks: Number.isInteger(metadata.forks_count) ? metadata.forks_count : null,
    files: {
      readme: paths === null ? null : paths.some((path) => README_PATTERN.test(path)),
      tests: paths === null ? null : paths.some((path) => TEST_PATTERN.test(path)),
      security: paths === null ? null : lowerPaths.has("security.md"),
      protocol_evidence: paths === null ? null : protocolPath ? lowerPaths.has(protocolPath.toLowerCase()) : false,
    },
    evidence_paths: {
      license: paths?.find((path) => LICENSE_PATTERN.test(path)) ?? null,
      readme: paths?.find((path) => README_PATTERN.test(path)) ?? null,
      tests: paths?.find((path) => TEST_PATTERN.test(path)) ?? null,
      security: paths?.find((path) => path.toLowerCase() === "security.md") ?? null,
      protocol: paths?.find((path) => protocolPath && path.toLowerCase() === protocolPath.toLowerCase()) ?? null,
    },
    automation: {
      present: paths === null ? null : paths.some((path) => WORKFLOW_PATTERN.test(path)),
      conclusion: typeof latestRun?.conclusion === "string" ? latestRun.conclusion : null,
      url: typeof latestRun?.html_url === "string" ? latestRun.html_url : null,
    },
    version: {
      release: typeof release?.tag_name === "string" ? release.tag_name : null,
      release_url: typeof release?.html_url === "string" ? release.html_url : null,
      tag: Array.isArray(tags) && typeof tags[0]?.name === "string" ? tags[0].name : null,
    },
    warnings: [...new Set(warnings)].sort(),
  };
  return { ...project, observation, coverage: scoreObservation(observation, now) };
}

async function mapWithConcurrency(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return output;
}

export async function buildReport(catalog, client, {
  now = new Date(),
  concurrency = 4,
} = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("now must be a Date");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("concurrency must be an integer from 1 to 10");
  }
  const projects = await mapWithConcurrency(
    catalog.projects,
    concurrency,
    (project) => inspectProject(project, client, now),
  );
  projects.sort((left, right) => left.repo.localeCompare(right.repo, "en", { sensitivity: "base" }));
  return {
    schema: "technocore-verified-index-report-v2",
    methodology_version: "2.0.0",
    generated_at: now.toISOString(),
    project_count: projects.length,
    projects,
  };
}

export function validateReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("report must be an object");
  }
  if (!["technocore-verified-index-report-v1", "technocore-verified-index-report-v2"].includes(report.schema)) {
    throw new Error("report schema is unsupported");
  }
  if (!Array.isArray(report.projects) || report.project_count !== report.projects.length) {
    throw new Error("report project count is inconsistent");
  }
  if (!Number.isFinite(Date.parse(report.generated_at))) {
    throw new Error("report generated_at must be an ISO timestamp");
  }
  const normalizedProjects = report.projects.map((project) => {
    if (typeof project.repo !== "string" || (!project.coverage && !project.readiness) || !project.observation) {
      throw new Error("report contains an invalid project");
    }
    const coverage = project.coverage ?? coverageFromLegacy(project.readiness);
    const validUnavailable = coverage.label === "unavailable" && coverage.percentage === null;
    const validPercentage =
      Number.isInteger(coverage.percentage) && coverage.percentage >= 0 && coverage.percentage <= 100;
    if (!validUnavailable && !validPercentage) {
      throw new Error(`report contains invalid evidence coverage for ${project.repo}`);
    }
    if (!Array.isArray(coverage.checks) || coverage.total !== coverage.checks.length) {
      throw new Error(`report contains inconsistent evidence checks for ${project.repo}`);
    }
    const expectedIds = SCORE_RULES.map((rule) => rule.id);
    const checkIds = coverage.checks.map((check) => check.id);
    const validChecks = coverage.checks.every((check) =>
      ["present", "missing", "unavailable"].includes(check.state)
      && check.passed === (check.state === "present")
      && check.awarded === (check.state === "present" ? 10 : 0));
    if (coverage.total !== SCORE_RULES.length
      || new Set(checkIds).size !== SCORE_RULES.length
      || expectedIds.some((id) => !checkIds.includes(id))
      || !validChecks) {
      throw new Error(`report contains invalid evidence checks for ${project.repo}`);
    }
    const present = coverage.checks.filter((check) => check.state === "present").length;
    const unavailable = coverage.checks.filter((check) => check.state === "unavailable").length;
    const observed = coverage.total - unavailable;
    const expectedPercentage = coverage.label === "unavailable" ? null : present * 10;
    if (coverage.present !== present
      || coverage.observed !== observed
      || coverage.percentage !== expectedPercentage
      || coverage.label !== labelForCoverage(expectedPercentage, unavailable)) {
      throw new Error(`report contains inconsistent evidence coverage for ${project.repo}`);
    }
    const { readiness: _legacyReadiness, ...rest } = project;
    return { ...rest, coverage };
  });
  return {
    ...report,
    schema: "technocore-verified-index-report-v2",
    methodology_version: "2.0.0",
    projects: normalizedProjects,
  };
}
