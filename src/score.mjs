export const EVIDENCE_RULES = Object.freeze([
  Object.freeze({ id: "accessible", group: "availability", label: "Repository accessible", description: "GitHub returned current repository metadata." }),
  Object.freeze({ id: "not_archived", group: "maintenance", label: "Repository active", description: "GitHub does not mark the repository as archived." }),
  Object.freeze({ id: "license", group: "documentation", label: "Recognized license", description: "GitHub reports a recognized SPDX license." }),
  Object.freeze({ id: "readme", group: "documentation", label: "Root README", description: "A root README is present in the repository tree." }),
  Object.freeze({ id: "tests", group: "verification", label: "Test evidence", description: "A conventional test path or test filename is present." }),
  Object.freeze({ id: "ci", group: "verification", label: "Latest automation passed", description: "The latest completed GitHub Actions run succeeded." }),
  Object.freeze({ id: "security", group: "security", label: "Security policy", description: "A root SECURITY.md file is present." }),
  Object.freeze({ id: "version", group: "release", label: "Version marker", description: "At least one GitHub release or Git tag exists." }),
  Object.freeze({ id: "protocol", group: "technocore", label: "Technocore evidence path", description: "The catalogued protocol-evidence path exists in the repository tree." }),
  Object.freeze({ id: "recent", group: "maintenance", label: "Recent activity", description: "The repository was pushed within the previous 180 days." }),
]);

// Public compatibility alias. Every observable signal contributes the same ten
// percentage points in methodology v2.
export const SCORE_RULES = Object.freeze(
  EVIDENCE_RULES.map((rule) => Object.freeze({ ...rule, points: 10 })),
);

function recentlyPushed(pushedAt, now) {
  const pushed = Date.parse(pushedAt ?? "");
  const selectedNow = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(pushed) || !Number.isFinite(selectedNow)) return false;
  const age = selectedNow - pushed;
  return age >= 0 && age <= 180 * 24 * 60 * 60 * 1000;
}

function warningFor(observation, source) {
  return observation.warnings?.some((warning) => warning === source || warning.startsWith(`${source}:`)) === true;
}

function state(value, unavailable = false) {
  if (unavailable) return "unavailable";
  return value ? "present" : "missing";
}

export function labelForCoverage(percentage, unavailableCount = 0) {
  if (percentage === null) return "unavailable";
  if (unavailableCount > 0) return "incomplete";
  if (percentage === 100) return "complete";
  if (percentage >= 70) return "strong";
  if (percentage >= 40) return "partial";
  return "limited";
}

export function scoreObservation(observation, now = new Date()) {
  const repositoryUnavailable = observation.available !== true;
  const treeUnavailable = repositoryUnavailable || warningFor(observation, "tree");
  const actionsUnavailable = repositoryUnavailable || warningFor(observation, "actions");
  const versionUnavailable =
    repositoryUnavailable || (warningFor(observation, "release") && warningFor(observation, "tags"));

  const states = {
    accessible: state(observation.available === true, repositoryUnavailable),
    not_archived: state(observation.archived === false, repositoryUnavailable),
    license: state(Boolean(observation.license), repositoryUnavailable),
    readme: state(observation.files?.readme === true, treeUnavailable),
    tests: state(observation.files?.tests === true, treeUnavailable),
    ci: state(observation.automation?.conclusion === "success", actionsUnavailable),
    security: state(observation.files?.security === true, treeUnavailable),
    version: state(Boolean(observation.version?.release || observation.version?.tag), versionUnavailable),
    protocol: state(observation.files?.protocol_evidence === true, treeUnavailable),
    recent: state(recentlyPushed(observation.pushed_at, now), repositoryUnavailable),
  };

  const checks = SCORE_RULES.map((rule) => ({
    ...rule,
    state: states[rule.id],
    passed: states[rule.id] === "present",
    awarded: states[rule.id] === "present" ? rule.points : 0,
  }));
  const present = checks.filter((check) => check.state === "present").length;
  const unavailable = checks.filter((check) => check.state === "unavailable").length;
  const observed = checks.length - unavailable;
  const percentage = repositoryUnavailable ? null : present * 10;

  return {
    percentage,
    label: labelForCoverage(percentage, unavailable),
    present,
    observed,
    total: checks.length,
    checks,
  };
}

export function coverageFromLegacy(readiness) {
  const checks = SCORE_RULES.map((rule) => {
    const legacy = readiness?.checks?.find((check) => check.id === rule.id);
    const checkState = legacy?.passed === true ? "present" : "missing";
    return {
      ...rule,
      state: checkState,
      passed: checkState === "present",
      awarded: checkState === "present" ? rule.points : 0,
    };
  });
  if (readiness?.score === null || readiness?.grade === "U") {
    const unavailableChecks = checks.map((check) => ({ ...check, state: "unavailable", passed: false, awarded: 0 }));
    return { percentage: null, label: "unavailable", present: 0, observed: 0, total: checks.length, checks: unavailableChecks };
  }
  const present = checks.filter((check) => check.state === "present").length;
  const percentage = present * 10;
  return { percentage, label: labelForCoverage(percentage), present, observed: checks.length, total: checks.length, checks };
}
