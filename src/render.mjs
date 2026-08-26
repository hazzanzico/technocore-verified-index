import { summarizeHistory } from "./history.mjs";
import { SCORE_RULES } from "./score.mjs";

const CATEGORY_LABELS = Object.freeze({
  applications: "Applications",
  automation: "Automation",
  clients: "Clients and SDKs",
  guides: "Guides",
  monitoring: "Monitoring",
  testing: "Testing",
  verification: "Identity and verification",
});

const GROUP_LABELS = Object.freeze({
  availability: "Availability",
  documentation: "Documentation",
  maintenance: "Maintenance",
  verification: "Testing and automation",
  security: "Security",
  release: "Release evidence",
  technocore: "Technocore evidence",
});

const COVERAGE_LABELS = Object.freeze({
  complete: "Complete",
  strong: "Strong",
  partial: "Partial",
  limited: "Limited",
  incomplete: "Incomplete observation",
  unavailable: "Unavailable",
});

const INDEX_REPOSITORY = "https://github.com/hazzanzico/technocore-verified-index";
const MAINTAINER_PROJECT = "hazzanzico/technocore-signed-action";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeMarkdown(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] ?? category;
}

function coverageLabel(label) {
  return COVERAGE_LABELS[label] ?? label;
}

function checkedDate(report) {
  return report.generated_at.slice(0, 10);
}

function readableTimestamp(value) {
  const selected = new Date(value);
  if (Number.isNaN(selected.getTime())) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(selected.getUTCDate()).padStart(2, "0");
  const hour = String(selected.getUTCHours()).padStart(2, "0");
  const minute = String(selected.getUTCMinutes()).padStart(2, "0");
  return `${day} ${months[selected.getUTCMonth()]} ${selected.getUTCFullYear()}, ${hour}:${minute} UTC`;
}

function coverageText(project) {
  return project.coverage.percentage === null ? "unavailable" : `${project.coverage.percentage}%`;
}

function signalText(project) {
  const labels = project.coverage.checks
    .filter((check) => check.state === "present" && ["tests", "ci", "security", "version", "protocol"].includes(check.id))
    .map((check) => check.id === "ci" ? "automation" : check.id === "protocol" ? "Technocore evidence" : check.id);
  return labels.length ? labels.join(", ") : "limited observed evidence";
}

function encodePath(value) {
  return String(value).split("/").map(encodeURIComponent).join("/");
}

function projectUrl(repo) {
  return `https://github.com/${encodePath(repo)}`;
}

function repositoryFileUrl(project, path) {
  if (!path || !project.observation.default_branch) return null;
  return `${projectUrl(project.repo)}/blob/${encodePath(project.observation.default_branch)}/${encodePath(path)}`;
}

function safeObservedLink(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === "github.com" ? parsed.href : null;
  } catch {
    return null;
  }
}

function evidenceUrl(project, check) {
  const paths = project.observation.evidence_paths ?? {};
  switch (check.id) {
    case "accessible":
    case "not_archived":
      return projectUrl(project.repo);
    case "license":
      return repositoryFileUrl(project, paths.license);
    case "readme":
      return repositoryFileUrl(project, paths.readme);
    case "tests":
      return repositoryFileUrl(project, paths.tests);
    case "ci":
      return safeObservedLink(project.observation.automation.url);
    case "security":
      return repositoryFileUrl(project, paths.security);
    case "version": {
      const release = safeObservedLink(project.observation.version.release_url);
      if (release) return release;
      return project.observation.version.tag
        ? `${projectUrl(project.repo)}/releases/tag/${encodeURIComponent(project.observation.version.tag)}`
        : null;
    }
    case "protocol":
      return repositoryFileUrl(project, paths.protocol ?? project.evidence?.protocol_path);
    case "recent":
      return project.observation.default_branch
        ? `${projectUrl(project.repo)}/commits/${encodePath(project.observation.default_branch)}`
        : projectUrl(project.repo);
    default:
      return null;
  }
}

function detailValue(value, escape = escapeMarkdown) {
  if (value === null || value === undefined || value === "") return "not observed";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return escape(value);
}

export function renderReadme(report) {
  const rows = report.projects
    .map((project) => {
      const available = project.observation.available ? "observed" : "unavailable";
      return `| [${escapeMarkdown(project.repo)}](${projectUrl(project.repo)}) | ${escapeMarkdown(project.summary)} | ${escapeMarkdown(categoryLabel(project.category))} | ${escapeMarkdown(coverageLabel(project.coverage.label))} | ${coverageText(project)} | ${escapeMarkdown(signalText(project))} | ${available} |`;
    })
    .join("\n");

  return `# Technocore Verified Index

[![CI](${INDEX_REPOSITORY}/actions/workflows/ci.yml/badge.svg)](${INDEX_REPOSITORY}/actions/workflows/ci.yml)
[![Refresh](${INDEX_REPOSITORY}/actions/workflows/refresh.yml/badge.svg)](${INDEX_REPOSITORY}/actions/workflows/refresh.yml)

An evidence-first, automatically refreshed index of community projects built
around [FLOP Labs' Technocore Chat](https://github.com/flop-labs/technocore-chat).

> **Independent community project.** A listing or evidence result is not FLOP
> Labs endorsement, a security audit, contribution credit, or airdrop eligibility.

## Launch provenance

The local signing client reported that Technocore accepted the v0.1.0 launch
record as room sequence \`249529\` from
\`did:key:z6MkjJYcYwGPvyCr5DpQRWQXPd8Bbd4n93aRdFfyUBVYaAxV\`.
Because rooms are rolling buffers, that sequence was already outside the
read-back window when checked. See [PROVENANCE.md](PROVENANCE.md) for the
client-returned receipt and its explicit verification limits.

## What makes this different

- The source catalog is structured JSON rather than a hand-maintained link table.
- A dependency-free verifier reads observable GitHub metadata on a schedule.
- It never clones, installs, imports, or executes an indexed project's code.
- Every signal is explained in [METHODOLOGY.md](METHODOLOGY.md).
- JSON, detailed Markdown, history, and a searchable static site come from one snapshot.
- The maintainer's own project receives the same versioned rules as every other entry.

## Current index

Generated ${escapeMarkdown(report.generated_at)} from ${report.project_count} catalogued projects.
Projects are ordered by repository name, not evidence coverage.

| Project | Purpose | Category | Coverage label | Evidence coverage | Present signals | API state |
|---|---|---|---|---:|---|---|
${rows}

Read the [detailed report](reports/latest.md), download the
[machine-readable snapshot](reports/latest.json), or browse the
[live searchable index](https://hazzanzico.github.io/technocore-verified-index/).

## Reading evidence coverage

Methodology v2 uses ten equally weighted observable signals. Each present signal
contributes ten percentage points. **100% means all ten measured signals were
found; it does not mean perfect, best, secure, endorsed, or airdrop-eligible.**

| Label | Meaning |
|---|---|
| Complete | All 10 signals are present. |
| Strong | 7–9 signals are present. |
| Partial | 4–6 signals are present. |
| Limited | 0–3 signals are present. |
| Incomplete observation | At least one upstream evidence source was unavailable. |
| Unavailable | Repository metadata could not be observed. |

## Reproduce

~~~console
npm ci
npm test
npm run refresh
~~~

<code>GITHUB_TOKEN</code> is optional locally and raises the GitHub API rate limit. Never
put a token in the catalog or a command-line URL.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and
[SECURITY.md](SECURITY.md). Maintainers can propose factual corrections through
pull requests. Descriptions are reviewed by people; observations are regenerated
by code.
`;
}

export function renderDetailedReport(report) {
  const projects = report.projects
    .map((project) => {
      const checks = project.coverage.checks
        .map((check) => {
          const url = evidenceUrl(project, check);
          const label = url ? `[${escapeMarkdown(check.label)}](${url})` : escapeMarkdown(check.label);
          return `| ${label} | ${check.state} | ${check.passed ? "10%" : "0%"} |`;
        })
        .join("\n");
      const runUrl = safeObservedLink(project.observation.automation.url);
      const run = runUrl ? `[${project.observation.automation.conclusion}](${runUrl})` : detailValue(project.observation.automation.conclusion);
      const warnings = project.observation.warnings.length
        ? project.observation.warnings.map(escapeMarkdown).join(", ")
        : "none";
      const ownership = project.repo === MAINTAINER_PROJECT
        ? "\n- Ownership disclosure: this repository is owned by the index maintainer."
        : "";
      return `## [${escapeMarkdown(project.repo)}](${projectUrl(project.repo)}) — ${escapeMarkdown(coverageLabel(project.coverage.label))} (${coverageText(project)})

${escapeMarkdown(project.summary)}

- Category: ${escapeMarkdown(categoryLabel(project.category))}
- Platforms: ${project.platforms.map(escapeMarkdown).join(", ")}
- Evidence present: ${project.coverage.present}/${project.coverage.total}
- Evidence evaluated: ${project.coverage.observed}/${project.coverage.total}
- License: ${detailValue(project.observation.license)}
- Default branch: ${detailValue(project.observation.default_branch)}
- Last push: ${detailValue(project.observation.pushed_at)}
- Latest completed automation: ${run}
- Latest release: ${detailValue(project.observation.version.release)}
- Latest tag: ${detailValue(project.observation.version.tag)}
- Observation warnings: ${warnings}${ownership}

| Observable signal | State | Coverage share |
|---|---|---:|
${checks}
`;
    })
    .join("\n");
  return `# Technocore Verified Index — detailed report

Generated ${escapeMarkdown(report.generated_at)} using methodology ${escapeMarkdown(report.methodology_version)}.
These results describe observable evidence coverage, not project quality,
security, protocol correctness, endorsement, or a ranking. See
[METHODOLOGY.md](../METHODOLOGY.md) for exact boundaries.

${projects}`;
}

function checksData(project) {
  return project.coverage.checks.map((check) => `${check.id}=${check.state}`).join(",");
}

function trendMarkup(project, history) {
  const points = (history.trends[project.repo] ?? []).filter((point) => Number.isInteger(point.percentage));
  if (points.length < 2) {
    return `<p class="trend-note">History begins ${escapeHtml(history.first_date)}. A trend appears after another daily snapshot.</p>`;
  }
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? 50 : 3 + (index * 94) / (points.length - 1);
    const y = 38 - (point.percentage * 0.34);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<div class="trend"><svg viewBox="0 0 100 42" role="img" aria-label="Evidence coverage history from ${escapeHtml(points[0].date)} to ${escapeHtml(points.at(-1).date)}"><line class="trend-axis" x1="3" y1="38" x2="97" y2="38"></line><polyline class="trend-line" points="${coordinates}"></polyline></svg><p class="trend-note">${points.length} daily snapshots · ${escapeHtml(points[0].date)} to ${escapeHtml(points.at(-1).date)}</p></div>`;
}

function evidenceItem(project, check) {
  const url = evidenceUrl(project, check);
  const label = url
    ? `<a class="evidence-link" href="${escapeHtml(url)}" rel="noreferrer">${escapeHtml(check.label)}</a>`
    : `<span>${escapeHtml(check.label)}</span>`;
  return `<li class="evidence-item state-${check.state}" data-check-id="${check.id}"><span class="state-dot" aria-hidden="true"></span>${label}<span class="evidence-state">${check.state}</span></li>`;
}

function groupedEvidence(project) {
  return Object.entries(GROUP_LABELS)
    .map(([group, label]) => {
      const checks = project.coverage.checks.filter((check) => check.group === group);
      if (!checks.length) return "";
      return `<section class="detail-block"><h4>${escapeHtml(label)}</h4><ul class="evidence-list">${checks.map((check) => evidenceItem(project, check)).join("")}</ul></section>`;
    })
    .join("");
}

function quickSignals(project) {
  return ["tests", "ci", "security", "version", "protocol"]
    .map((id) => project.coverage.checks.find((check) => check.id === id))
    .filter(Boolean)
    .map((check) => `<span class="signal signal-${check.state}">${escapeHtml(check.id === "ci" ? "automation" : check.id)}</span>`)
    .join("");
}

function renderCard(project, history) {
  const [owner, name] = project.repo.split("/");
  const percentage = project.coverage.percentage;
  const displayedPercentage = percentage === null ? "—" : `${percentage}%`;
  const platforms = project.platforms.map((platform) => `<span class="pill">${escapeHtml(platform)}</span>`).join("");
  const tags = project.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  const searchable = [project.repo, project.summary, project.category, ...project.platforms, ...project.tags].join(" ").toLowerCase();
  const maintainerOwned = project.repo === MAINTAINER_PROJECT ? `<span class="pill">Maintainer-owned</span>` : "";
  const release = project.observation.version.release ?? project.observation.version.tag ?? "not observed";
  return `<article class="project-card" data-project-card data-repo="${escapeHtml(project.repo)}" data-category="${escapeHtml(project.category)}" data-coverage="${escapeHtml(project.coverage.label)}" data-percentage="${percentage ?? ""}" data-platforms="${escapeHtml(project.platforms.join(","))}" data-checks="${escapeHtml(checksData(project))}" data-search="${escapeHtml(searchable)}" data-pushed-at="${escapeHtml(project.observation.pushed_at ?? "")}">
  <div class="card-top">
    <div><span class="repo-owner">${escapeHtml(owner)}</span><h3><a href="${projectUrl(project.repo)}" rel="noreferrer">${escapeHtml(name)}</a></h3></div>
    <div class="coverage-visual"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="coverage-track" cx="21" cy="21" r="15.9"></circle><circle class="coverage-value" cx="21" cy="21" r="15.9" pathLength="100" stroke-dasharray="${percentage ?? 0} 100"></circle></svg><div class="coverage-number"><strong>${displayedPercentage}</strong><span>coverage</span></div></div>
  </div>
  <div class="project-body">
    <p class="project-summary">${escapeHtml(project.summary)}</p>
    <div class="label-row"><span class="pill pill-category">${escapeHtml(categoryLabel(project.category))}</span><span class="pill pill-${escapeHtml(project.coverage.label)}">${escapeHtml(coverageLabel(project.coverage.label))}</span>${maintainerOwned}</div>
    <div class="tag-row">${platforms}${tags}</div>
    <div class="quick-signals" aria-label="Selected evidence signals">${quickSignals(project)}</div>
    <details class="project-details"><summary>Inspect ${project.coverage.present}/${project.coverage.total} evidence signals</summary><div class="details-grid">${groupedEvidence(project)}<section class="detail-block"><h4>Repository metadata</h4><dl class="metadata"><dt>License</dt><dd>${escapeHtml(project.observation.license ?? "not observed")}</dd><dt>Last push</dt><dd>${escapeHtml(project.observation.pushed_at ?? "not observed")}</dd><dt>Branch</dt><dd>${escapeHtml(project.observation.default_branch ?? "not observed")}</dd><dt>Version</dt><dd>${escapeHtml(release)}</dd><dt>Observed</dt><dd>${escapeHtml(project.coverage.observed)}/${escapeHtml(project.coverage.total)} signals</dd></dl>${trendMarkup(project, history)}</section></div></details>
  </div>
  <div class="card-footer"><label class="compare-control"><input type="checkbox" value="${escapeHtml(project.repo)}" data-compare> Add to comparison</label></div>
</article>`;
}

function renderTableRow(project) {
  return `<tr data-project-row data-repo="${escapeHtml(project.repo)}"><th scope="row"><a class="table-repo" href="${projectUrl(project.repo)}" rel="noreferrer">${escapeHtml(project.repo)}</a></th><td>${escapeHtml(categoryLabel(project.category))}</td><td>${escapeHtml(coverageLabel(project.coverage.label))}</td><td>${escapeHtml(coverageText(project))}</td><td>${escapeHtml(project.coverage.present)}/${escapeHtml(project.coverage.total)}</td><td>${escapeHtml(project.observation.pushed_at?.slice(0, 10) ?? "not observed")}</td></tr>`;
}

function renderChanges(history) {
  if (history.snapshot_count < 2) {
    return `<div class="history-empty"><span class="history-dot" aria-hidden="true"></span><p><strong>Baseline snapshot recorded ${escapeHtml(history.first_date)}.</strong>Historical changes and charts will appear after another daily snapshot.</p></div>`;
  }
  if (!history.changes.length) {
    return `<div class="history-empty"><span class="history-dot" aria-hidden="true"></span><p><strong>No evidence changes since ${escapeHtml(history.previous_date)}.</strong>The latest daily snapshot retained the same observable states.</p></div>`;
  }
  const items = history.changes.slice(0, 8).map((change) => {
    const delta = change.delta === null ? "new project" : change.delta > 0 ? `+${change.delta} percentage points` : change.delta < 0 ? `${change.delta} percentage points` : `${change.changed_checks.length} signal changes`;
    return `<li class="change-item"><strong>${escapeHtml(change.repo)}</strong><span>${escapeHtml(delta)}</span></li>`;
  }).join("");
  return `<ul class="change-list">${items}</ul>`;
}

export function renderHtml(report, historyReports = []) {
  const history = summarizeHistory(report, historyReports);
  const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("");
  const platformOptions = [...new Set(report.projects.flatMap((project) => project.platforms))].sort().map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`).join("");
  const cards = report.projects.map((project) => renderCard(project, history)).join("\n");
  const rows = report.projects.map(renderTableRow).join("\n");
  const complete = report.projects.filter((project) => project.coverage.label === "complete").length;
  const observed = report.projects.filter((project) => project.observation.available).length;
  const fresh = report.projects.filter((project) => project.coverage.checks.find((check) => check.id === "recent")?.state === "present").length;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="An evidence-first, automatically refreshed index of Technocore community projects.">
  <meta name="theme-color" content="#070a0f">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'">
  <title>Technocore Verified Index</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
<a class="skip-link" href="#explorer">Skip to project explorer</a>
<header class="site-shell topbar">
  <a class="brand" href="./"><span class="brand-mark" aria-hidden="true">TVI</span><span class="brand-copy">Technocore Verified Index<small>Independent evidence index</small></span></a>
  <nav class="topnav" aria-label="Primary"><a href="#changes">Changes</a><a href="${INDEX_REPOSITORY}/blob/main/METHODOLOGY.md">Methodology</a><a href="${INDEX_REPOSITORY}">GitHub</a></nav>
</header>
<main>
  <section class="site-shell hero" aria-labelledby="page-title">
    <div><p class="kicker">Evidence over hype</p><h1 id="page-title">See what the ecosystem can show.</h1><p class="hero-copy">A reproducible view of observable GitHub evidence across community Technocore projects. Updated automatically, explained signal by signal, and never ranked by popularity.</p><div class="hero-actions"><a class="button button-primary" href="#explorer">Explore ${report.project_count} projects</a><a class="button" href="${INDEX_REPOSITORY}/issues/new?template=project.yml">Submit or correct a project</a></div></div>
    <aside class="hero-aside" aria-label="Latest observation"><p class="aside-title">Latest observation</p><p class="aside-value"><time datetime="${escapeHtml(report.generated_at)}">${escapeHtml(readableTimestamp(report.generated_at))}</time></p><p class="aside-note">Static hosting, automatically refreshed data. No indexed repository is cloned, installed, imported, or executed.</p></aside>
  </section>

  <section class="site-shell metrics" aria-label="Index overview">
    <article class="metric"><strong>${report.project_count}</strong><span>catalogued projects</span></article>
    <article class="metric"><strong>${observed}</strong><span>repositories observed</span></article>
    <article class="metric"><strong>${complete}</strong><span>with all 10 signals present</span></article>
    <article class="metric"><strong>${fresh}</strong><span>pushed within 180 days</span></article>
  </section>

  <aside class="site-shell disclosure"><span class="disclosure-icon" aria-hidden="true">◆</span><p><strong>Coverage is not quality.</strong> 100% means all ten measured signals were found—not perfect, best, secure, endorsed, or airdrop-eligible. Projects are alphabetical by default. The index maintainer also owns <a href="https://github.com/${MAINTAINER_PROJECT}">${MAINTAINER_PROJECT}</a>.</p></aside>

  <section class="site-shell section" id="changes" aria-labelledby="changes-title"><div class="section-heading"><div><p class="eyebrow">Daily history</p><h2 id="changes-title">What changed?</h2><p>${history.snapshot_count} dated snapshot${history.snapshot_count === 1 ? "" : "s"} retained from ${escapeHtml(history.first_date)} through ${escapeHtml(history.latest_date)}.</p></div><a class="button button-quiet" href="${INDEX_REPOSITORY}/tree/main/reports/history">Browse history</a></div><div class="history-panel">${renderChanges(history)}</div></section>

  <section class="site-shell section explorer" id="explorer" aria-labelledby="explorer-title">
    <div class="section-heading"><div><p class="eyebrow">Project explorer</p><h2 id="explorer-title">Find evidence, not winners.</h2><p>Search capabilities, narrow observable signals, and inspect exactly why each result appears.</p></div><div class="section-actions"><a class="button button-quiet" href="${INDEX_REPOSITORY}/blob/main/reports/latest.json">Download JSON</a><a class="button button-quiet" href="${INDEX_REPOSITORY}/blob/main/PROVENANCE.md">Provenance</a></div></div>
    <div class="toolbar" aria-label="Project filters">
      <div class="field field-search"><label for="search">Search</label><input id="search" type="search" placeholder="Project, platform, or capability" autocomplete="off"></div>
      <div class="field"><label for="category">Category</label><select id="category"><option value="">All categories</option>${categoryOptions}</select></div>
      <div class="field"><label for="coverage">Coverage</label><select id="coverage"><option value="">All labels</option>${Object.entries(COVERAGE_LABELS).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}</select></div>
      <div class="field"><label for="platform">Platform</label><select id="platform"><option value="">All platforms</option>${platformOptions}</select></div>
      <div class="field"><label for="signal">Required signal</label><select id="signal"><option value="">Any signal state</option><option value="tests">Tests present</option><option value="ci">Automation passed</option><option value="security">Security policy</option><option value="version">Version marker</option><option value="protocol">Technocore evidence</option></select></div>
    </div>
    <div class="explorer-meta"><p><strong id="result-count">${report.project_count}</strong> projects shown · checked ${checkedDate(report)}</p><div class="explorer-tools"><label class="field"><span class="eyebrow">Sort</span><select id="sort" aria-label="Sort projects"><option value="name">Repository name</option><option value="coverage">Evidence coverage</option><option value="recent">Recent activity</option></select></label><button class="compact-button" id="clear-filters" type="button">Clear filters</button><button class="compact-button" id="share-view" type="button">Share this view</button><button class="view-button" type="button" data-view-button="cards" aria-pressed="true">Cards</button><button class="view-button" type="button" data-view-button="table" aria-pressed="false">Table</button></div></div>
    <p class="sr-only" id="result-status" aria-live="polite">${report.project_count} of ${report.project_count} projects shown.</p>
    <div class="project-grid" id="project-cards">${cards}</div>
    <div class="table-wrap" id="project-table-wrap" hidden><table class="project-table"><caption>Observable evidence overview. The default order is alphabetical, not ranked.</caption><thead><tr><th scope="col">Repository</th><th scope="col">Category</th><th scope="col">Label</th><th scope="col">Coverage</th><th scope="col">Signals</th><th scope="col">Last push</th></tr></thead><tbody id="project-table-body">${rows}</tbody></table></div>
    <div class="no-results" id="no-results" hidden><strong>No projects match this view.</strong>Clear one or more filters to return to the full alphabetical index.</div>
    <p id="compare-status" aria-live="polite">Select two or three projects to compare observable evidence.</p>
  </section>

  <section class="site-shell section comparison" id="comparison" hidden aria-labelledby="comparison-title"><div class="comparison-shell"><div class="comparison-head"><div><p class="eyebrow">Side by side</p><h2 id="comparison-title">Compare evidence states</h2></div><button class="compact-button" id="clear-comparison" type="button">Clear comparison</button></div><div class="comparison-grid" id="comparison-grid"></div></div></section>
</main>

<footer class="site-shell site-footer"><div class="footer-grid"><div><strong>Technocore Verified Index</strong><p>Generated from a structured catalog. GitHub is the source of truth; this site is the discovery and explanation layer.</p></div><nav class="footer-links" aria-label="Project links"><a href="${INDEX_REPOSITORY}/blob/main/METHODOLOGY.md">Methodology</a><a href="${INDEX_REPOSITORY}/blob/main/GOVERNANCE.md">Governance</a><a href="${INDEX_REPOSITORY}/blob/main/CONTRIBUTING.md">Contribute</a><a href="https://github.com/flop-labs/technocore-chat">Official Technocore source</a></nav></div><p class="maintainer-disclosure">Independent community project. Listing and coverage do not establish FLOP Labs endorsement, security review, contribution credit, or airdrop eligibility.</p></footer>
<script type="module" src="./app.mjs"></script>
</body>
</html>\n`;
}

export function serializeReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function scoreRuleTotal() {
  return SCORE_RULES.reduce((total, rule) => total + rule.points, 0);
}
