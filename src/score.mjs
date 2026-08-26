export const SCORE_RULES = Object.freeze([
  Object.freeze({ id: "accessible", label: "Repository accessible", points: 15 }),
  Object.freeze({ id: "not_archived", label: "Not archived", points: 10 }),
  Object.freeze({ id: "license", label: "Recognized license", points: 10 }),
  Object.freeze({ id: "readme", label: "Root README", points: 10 }),
  Object.freeze({ id: "tests", label: "Test evidence", points: 10 }),
  Object.freeze({ id: "ci", label: "Latest automation passed", points: 15 }),
  Object.freeze({ id: "security", label: "Root security policy", points: 10 }),
  Object.freeze({ id: "version", label: "Release or tag", points: 10 }),
  Object.freeze({ id: "protocol", label: "Protocol evidence path", points: 5 }),
  Object.freeze({ id: "recent", label: "Pushed within 180 days", points: 5 }),
]);

function recentlyPushed(pushedAt, now) {
  const pushed = Date.parse(pushedAt ?? "");
  const selectedNow = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(pushed) || !Number.isFinite(selectedNow)) return false;
  const age = selectedNow - pushed;
  return age >= 0 && age <= 180 * 24 * 60 * 60 * 1000;
}

export function gradeForScore(score) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

export function scoreObservation(observation, now = new Date()) {
  const passed = {
    accessible: observation.available === true,
    not_archived: observation.available === true && observation.archived === false,
    license: Boolean(observation.license),
    readme: observation.files?.readme === true,
    tests: observation.files?.tests === true,
    ci: observation.automation?.conclusion === "success",
    security: observation.files?.security === true,
    version: Boolean(observation.version?.release || observation.version?.tag),
    protocol: observation.files?.protocol_evidence === true,
    recent: recentlyPushed(observation.pushed_at, now),
  };
  const checks = SCORE_RULES.map((rule) => ({
    ...rule,
    passed: passed[rule.id],
    awarded: passed[rule.id] ? rule.points : 0,
  }));
  if (observation.available !== true) {
    return { score: null, grade: "U", checks };
  }
  const score = checks.reduce((total, check) => total + check.awarded, 0);
  return { score, grade: gradeForScore(score), checks };
}
