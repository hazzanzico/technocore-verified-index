import {
  DEFAULT_STATE,
  filterProjects,
  parseUrlState,
  serializeUrlState,
  sortProjects,
  toggleComparison,
} from "./ui-state.mjs";

const CHECK_LABELS = Object.freeze({
  accessible: "Repository accessible",
  not_archived: "Repository active",
  license: "Recognized license",
  readme: "Root README",
  tests: "Test evidence",
  ci: "Latest automation passed",
  security: "Security policy",
  version: "Version marker",
  protocol: "Technocore evidence path",
  recent: "Recent activity",
});

const controls = {
  query: document.querySelector("#search"),
  category: document.querySelector("#category"),
  coverage: document.querySelector("#coverage"),
  platform: document.querySelector("#platform"),
  signal: document.querySelector("#signal"),
  sort: document.querySelector("#sort"),
};
const cardContainer = document.querySelector("#project-cards");
const tableContainer = document.querySelector("#project-table-wrap");
const tableBody = document.querySelector("#project-table-body");
const resultCount = document.querySelector("#result-count");
const resultStatus = document.querySelector("#result-status");
const noResults = document.querySelector("#no-results");
const comparison = document.querySelector("#comparison");
const comparisonGrid = document.querySelector("#comparison-grid");
const compareStatus = document.querySelector("#compare-status");
const viewButtons = [...document.querySelectorAll("[data-view-button]")];
const cards = [...document.querySelectorAll("[data-project-card]")];
const rows = [...document.querySelectorAll("[data-project-row]")];

function checksFrom(value) {
  return Object.fromEntries(
    String(value ?? "")
      .split(",")
      .filter(Boolean)
      .map((entry) => entry.split("="))
      .filter(([id, state]) => CHECK_LABELS[id] && ["present", "missing", "unavailable"].includes(state)),
  );
}

const projects = cards.map((card) => ({
  repo: card.dataset.repo,
  category: card.dataset.category,
  coverage: card.dataset.coverage,
  percentage: card.dataset.percentage === "" ? null : Number(card.dataset.percentage),
  platforms: card.dataset.platforms.split(",").filter(Boolean),
  checks: checksFrom(card.dataset.checks),
  search: card.dataset.search,
  pushedAt: card.dataset.pushedAt,
}));
const projectsByRepo = new Map(projects.map((project) => [project.repo, project]));
const cardsByRepo = new Map(cards.map((card) => [card.dataset.repo, card]));
const rowsByRepo = new Map(rows.map((row) => [row.dataset.repo, row]));

function stateFromLocation() {
  const parsed = parseUrlState(location.search);
  return {
    ...DEFAULT_STATE,
    ...parsed,
    compare: parsed.compare.filter((repo) => projectsByRepo.has(repo)),
  };
}

let state = stateFromLocation();

function applyControls() {
  for (const [name, control] of Object.entries(controls)) control.value = state[name];
  for (const button of viewButtons) {
    const selected = button.dataset.viewButton === state.view;
    button.setAttribute("aria-pressed", String(selected));
  }
  cardContainer.hidden = state.view !== "cards";
  tableContainer.hidden = state.view !== "table";
  for (const checkbox of document.querySelectorAll("[data-compare]")) {
    checkbox.checked = state.compare.includes(checkbox.value);
  }
}

function updateUrl() {
  const query = serializeUrlState(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function createCell(text, scope = null) {
  const cell = document.createElement(scope ? "th" : "td");
  if (scope) cell.scope = scope;
  cell.textContent = text;
  return cell;
}

function renderComparison() {
  comparisonGrid.replaceChildren();
  const selected = state.compare.map((repo) => projectsByRepo.get(repo)).filter(Boolean);
  comparison.hidden = selected.length < 2;
  compareStatus.textContent = selected.length
    ? `${selected.length} of 3 projects selected for comparison.`
    : "Select two or three projects to compare observable evidence.";
  if (selected.length < 2) return;

  const table = document.createElement("table");
  table.className = "comparison-table";
  const caption = document.createElement("caption");
  caption.textContent = "Side-by-side observable evidence comparison. No project is declared a winner.";
  table.append(caption);
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(createCell("Signal", "col"));
  for (const project of selected) headRow.append(createCell(project.repo, "col"));
  head.append(headRow);
  table.append(head);
  const body = document.createElement("tbody");
  const coverageRow = document.createElement("tr");
  coverageRow.append(createCell("Evidence coverage", "row"));
  for (const project of selected) {
    coverageRow.append(createCell(project.percentage === null ? "Unavailable" : `${project.percentage}% - ${project.coverage}`));
  }
  body.append(coverageRow);
  for (const [id, label] of Object.entries(CHECK_LABELS)) {
    const row = document.createElement("tr");
    row.append(createCell(label, "row"));
    for (const project of selected) row.append(createCell(project.checks[id] ?? "unavailable"));
    body.append(row);
  }
  table.append(body);
  comparisonGrid.append(table);
}

function render() {
  const visible = sortProjects(filterProjects(projects, state), state.sort);
  const visibleRepos = new Set(visible.map((project) => project.repo));
  for (const project of projects) {
    const hidden = !visibleRepos.has(project.repo);
    cardsByRepo.get(project.repo).hidden = hidden;
    rowsByRepo.get(project.repo).hidden = hidden;
  }
  const ordered = [
    ...visible,
    ...projects.filter((project) => !visibleRepos.has(project.repo)),
  ];
  cardContainer.replaceChildren(...ordered.map((project) => cardsByRepo.get(project.repo)));
  tableBody.replaceChildren(...ordered.map((project) => rowsByRepo.get(project.repo)));
  resultCount.textContent = String(visible.length);
  resultStatus.textContent = `${visible.length} of ${projects.length} projects shown.`;
  noResults.hidden = visible.length !== 0;
  renderComparison();
  updateUrl();
}

for (const [name, control] of Object.entries(controls)) {
  control.addEventListener(name === "query" ? "input" : "change", () => {
    state = { ...state, [name]: control.value };
    render();
  });
}

for (const button of viewButtons) {
  button.addEventListener("click", () => {
    state = { ...state, view: button.dataset.viewButton };
    applyControls();
    render();
  });
}

document.querySelector("#clear-filters").addEventListener("click", () => {
  state = { ...DEFAULT_STATE, compare: state.compare };
  applyControls();
  render();
  controls.query.focus();
});

for (const checkbox of document.querySelectorAll("[data-compare]")) {
  checkbox.addEventListener("change", () => {
    const next = toggleComparison(state.compare, checkbox.value);
    if (checkbox.checked && next.length === state.compare.length) {
      checkbox.checked = false;
      compareStatus.textContent = "Comparison is limited to three projects.";
      return;
    }
    state = { ...state, compare: next };
    applyControls();
    render();
  });
}

document.querySelector("#clear-comparison").addEventListener("click", () => {
  state = { ...state, compare: [] };
  applyControls();
  render();
});

document.querySelector("#share-view").addEventListener("click", async () => {
  const button = document.querySelector("#share-view");
  try {
    await navigator.clipboard.writeText(location.href);
    button.textContent = "Link copied";
  } catch {
    button.textContent = "Copy URL from address bar";
  }
  setTimeout(() => { button.textContent = "Share this view"; }, 1800);
});

window.addEventListener("popstate", () => {
  state = stateFromLocation();
  applyControls();
  render();
});

document.documentElement.classList.add("js");
applyControls();
if (location.search) render();
