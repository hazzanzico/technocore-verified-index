import { GitHubApiError, repositoryApiPath } from "./github.mjs";
import { scoreObservation } from "./score.mjs";

const README_PATTERN = /^readme(?:\.[^/]+)?$/i;
const TEST_PATTERN = /(^|\/)(?:test|tests|spec|specs)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i;
const WORKFLOW_PATTERN = /^\.github\/workflows\/[^/]+\.ya?ml$/i;

function pathsFromTree(tree) {
  if (!tree || !Array.isArray(tree.tree)) return [];
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
      files: { readme: false, tests: false, security: false, protocol_evidence: false },
      automation: { present: false, conclusion: null, url: null },
      version: { release: null, tag: null },
      warnings: [],
    };
    return { ...project, observation, readiness: scoreObservation(observation, now) };
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
  const paths = pathsFromTree(tree);
  const lowerPaths = new Set(paths.map((path) => path.toLowerCase()));
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
      readme: paths.some((path) => README_PATTERN.test(path)),
      tests: paths.some((path) => TEST_PATTERN.test(path)),
      security: lowerPaths.has("security.md"),
      protocol_evidence: protocolPath ? lowerPaths.has(protocolPath.toLowerCase()) : false,
    },
    automation: {
      present: paths.some((path) => WORKFLOW_PATTERN.test(path)),
      conclusion: typeof latestRun?.conclusion === "string" ? latestRun.conclusion : null,
      url: typeof latestRun?.html_url === "string" ? latestRun.html_url : null,
    },
    version: {
      release: typeof release?.tag_name === "string" ? release.tag_name : null,
      tag: Array.isArray(tags) && typeof tags[0]?.name === "string" ? tags[0].name : null,
    },
    warnings: [...new Set(warnings)].sort(),
  };
  return { ...project, observation, readiness: scoreObservation(observation, now) };
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
    schema: "technocore-verified-index-report-v1",
    methodology_version: "1.0.0",
    generated_at: now.toISOString(),
    project_count: projects.length,
    projects,
  };
}

export function validateReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("report must be an object");
  }
  if (report.schema !== "technocore-verified-index-report-v1") {
    throw new Error("report schema is unsupported");
  }
  if (!Array.isArray(report.projects) || report.project_count !== report.projects.length) {
    throw new Error("report project count is inconsistent");
  }
  if (!Number.isFinite(Date.parse(report.generated_at))) {
    throw new Error("report generated_at must be an ISO timestamp");
  }
  for (const project of report.projects) {
    if (typeof project.repo !== "string" || !project.readiness || !project.observation) {
      throw new Error("report contains an invalid project");
    }
    const validUnscored = project.readiness.grade === "U" && project.readiness.score === null;
    const validScore =
      Number.isInteger(project.readiness.score) &&
      project.readiness.score >= 0 &&
      project.readiness.score <= 100 &&
      project.readiness.grade !== "U";
    if (!validUnscored && !validScore) {
      throw new Error(`report contains an invalid score for ${project.repo}`);
    }
  }
  return report;
}
