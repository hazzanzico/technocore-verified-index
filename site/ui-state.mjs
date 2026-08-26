const COVERAGE_LABELS = new Set(["complete", "strong", "partial", "limited", "incomplete", "unavailable"]);
const SORTS = new Set(["name", "coverage", "recent"]);
const VIEWS = new Set(["cards", "table"]);
const TOKEN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const DEFAULT_STATE = Object.freeze({
  query: "",
  category: "",
  coverage: "",
  platform: "",
  signal: "",
  sort: "name",
  view: "cards",
  compare: Object.freeze([]),
});

function cleanToken(value) {
  const selected = String(value ?? "").toLowerCase();
  return TOKEN.test(selected) ? selected : "";
}

export function parseUrlState(value) {
  const params = value instanceof URLSearchParams ? value : new URLSearchParams(value);
  const coverage = String(params.get("coverage") ?? "").toLowerCase();
  const sort = String(params.get("sort") ?? "").toLowerCase();
  const view = String(params.get("view") ?? "").toLowerCase();
  const compare = String(params.get("compare") ?? "")
    .split(",")
    .filter((repo, index, all) => REPOSITORY.test(repo) && all.indexOf(repo) === index)
    .slice(0, 3);
  return {
    query: String(params.get("q") ?? "").trim().slice(0, 120),
    category: cleanToken(params.get("category")),
    coverage: COVERAGE_LABELS.has(coverage) ? coverage : "",
    platform: cleanToken(params.get("platform")),
    signal: cleanToken(params.get("signal")),
    sort: SORTS.has(sort) ? sort : DEFAULT_STATE.sort,
    view: VIEWS.has(view) ? view : DEFAULT_STATE.view,
    compare,
  };
}

export function serializeUrlState(state) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category) params.set("category", state.category);
  if (state.coverage) params.set("coverage", state.coverage);
  if (state.platform) params.set("platform", state.platform);
  if (state.signal) params.set("signal", state.signal);
  if (state.sort && state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.view && state.view !== DEFAULT_STATE.view) params.set("view", state.view);
  if (state.compare?.length) params.set("compare", state.compare.slice(0, 3).join(","));
  return params;
}

export function filterProjects(projects, state) {
  const query = state.query.trim().toLowerCase();
  return projects.filter((project) => {
    if (query && !project.search.includes(query)) return false;
    if (state.category && project.category !== state.category) return false;
    if (state.coverage && project.coverage !== state.coverage) return false;
    if (state.platform && !project.platforms.includes(state.platform)) return false;
    if (state.signal && project.checks[state.signal] !== "present") return false;
    return true;
  });
}

function percentage(project) {
  return Number.isInteger(project.percentage) ? project.percentage : -1;
}

function pushedTime(project) {
  const selected = Date.parse(project.pushedAt ?? "");
  return Number.isFinite(selected) ? selected : 0;
}

export function sortProjects(projects, sort = "name") {
  return [...projects].sort((left, right) => {
    if (sort === "coverage") {
      return percentage(right) - percentage(left) || left.repo.localeCompare(right.repo);
    }
    if (sort === "recent") {
      return pushedTime(right) - pushedTime(left) || left.repo.localeCompare(right.repo);
    }
    return left.repo.localeCompare(right.repo, "en", { sensitivity: "base" });
  });
}

export function toggleComparison(selected, repo, limit = 3) {
  const current = selected.filter((item, index, all) => REPOSITORY.test(item) && all.indexOf(item) === index);
  if (current.includes(repo)) return current.filter((item) => item !== repo);
  if (!REPOSITORY.test(repo) || current.length >= limit) return current.slice(0, limit);
  return [...current, repo];
}
