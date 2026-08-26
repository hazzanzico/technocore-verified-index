function dateKey(timestamp) {
  return typeof timestamp === "string" ? timestamp.slice(0, 10) : "";
}

function coverageFor(report, repo) {
  return report.projects.find((project) => project.repo === repo)?.coverage ?? null;
}

export function summarizeHistory(currentReport, historyReports = []) {
  const byDate = new Map();
  for (const report of [...historyReports, currentReport]) {
    const date = dateKey(report?.generated_at);
    if (date && Array.isArray(report.projects)) byDate.set(date, report);
  }
  const snapshots = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, report]) => ({ date, report }));
  const previous = snapshots.length > 1 ? snapshots.at(-2).report : null;
  const trends = {};
  const changes = [];

  for (const project of currentReport.projects) {
    trends[project.repo] = snapshots.map(({ date, report }) => {
      const coverage = coverageFor(report, project.repo);
      return { date, percentage: coverage?.percentage ?? null, label: coverage?.label ?? "unavailable" };
    });
    if (!previous) continue;
    const before = coverageFor(previous, project.repo);
    const after = project.coverage;
    if (!before) {
      changes.push({ repo: project.repo, kind: "added", delta: null, changed_checks: [] });
      continue;
    }
    const beforeChecks = new Map(before.checks.map((check) => [check.id, check.state]));
    const changedChecks = after.checks
      .filter((check) => beforeChecks.get(check.id) !== check.state)
      .map((check) => ({ id: check.id, from: beforeChecks.get(check.id) ?? "unavailable", to: check.state }));
    const delta =
      Number.isInteger(before.percentage) && Number.isInteger(after.percentage)
        ? after.percentage - before.percentage
        : null;
    if (delta !== 0 || changedChecks.length > 0 || before.label !== after.label) {
      changes.push({ repo: project.repo, kind: "changed", delta, changed_checks: changedChecks });
    }
  }

  return {
    snapshot_count: snapshots.length,
    first_date: snapshots[0]?.date ?? dateKey(currentReport.generated_at),
    previous_date: snapshots.length > 1 ? snapshots.at(-2).date : null,
    latest_date: snapshots.at(-1)?.date ?? dateKey(currentReport.generated_at),
    changes,
    trends,
  };
}
