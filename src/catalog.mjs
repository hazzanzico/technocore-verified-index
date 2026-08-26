import { readFile } from "node:fs/promises";

export const CATEGORIES = Object.freeze([
  "applications",
  "automation",
  "clients",
  "guides",
  "monitoring",
  "testing",
  "verification",
]);

const REPOSITORY_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/;
const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]|\p{Cf}/u;
const PROJECT_KEYS = new Set([
  "repo",
  "category",
  "summary",
  "platforms",
  "tags",
  "evidence",
]);
const EVIDENCE_KEYS = new Set(["protocol_path", "live_record"]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function exactKeys(object, allowed, label) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new Error(`${label} contains unknown field ${key}`);
  }
}

function safeString(value, label, { min = 1, max = 240 } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new Error(`${label} must contain ${min}-${max} characters`);
  }
  if (value.trim() !== value || CONTROL_PATTERN.test(value)) {
    throw new Error(`${label} must be trimmed single-line visible text`);
  }
  return value;
}

function labels(value, label) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new Error(`${label} must contain 1-8 values`);
  }
  const output = value.map((item, index) => {
    const selected = safeString(item, `${label}[${index}]`, { max: 32 });
    if (!LABEL_PATTERN.test(selected)) {
      throw new Error(`${label}[${index}] must use lowercase letters, digits, or hyphens`);
    }
    return selected;
  });
  if (new Set(output).size !== output.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
  return output;
}

function evidence(value, label) {
  if (value === undefined) return undefined;
  const selected = plainObject(value, label);
  exactKeys(selected, EVIDENCE_KEYS, label);
  const output = {};
  if (selected.protocol_path !== undefined) {
    const path = safeString(selected.protocol_path, `${label}.protocol_path`);
    if (
      path.startsWith("/") ||
      path.startsWith("\\") ||
      path.includes("\\") ||
      path.split("/").includes("..")
    ) {
      throw new Error(`${label}.protocol_path must be a repository-relative POSIX path`);
    }
    output.protocol_path = path;
  }
  if (selected.live_record !== undefined) {
    const rawUrl = safeString(selected.live_record, `${label}.live_record`, { max: 500 });
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`${label}.live_record must be a valid URL`);
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "technocore.chat" ||
      parsed.pathname !== "/humans" ||
      !parsed.hash.startsWith("#r/")
    ) {
      throw new Error(`${label}.live_record must be a technocore.chat human record URL`);
    }
    output.live_record = parsed.href;
  }
  if (Object.keys(output).length === 0) {
    throw new Error(`${label} must contain at least one evidence field`);
  }
  return output;
}

export function validateCatalog(value) {
  const root = plainObject(value, "catalog");
  exactKeys(root, new Set(["version", "projects"]), "catalog");
  if (root.version !== 1) throw new Error("catalog version must be 1");
  if (!Array.isArray(root.projects) || root.projects.length === 0) {
    throw new Error("catalog projects must be a non-empty array");
  }

  const repositories = new Set();
  const projects = root.projects.map((rawProject, index) => {
    const label = `catalog.projects[${index}]`;
    const project = plainObject(rawProject, label);
    exactKeys(project, PROJECT_KEYS, label);
    const repo = safeString(project.repo, `${label}.repo`, { max: 140 });
    if (!REPOSITORY_PATTERN.test(repo)) {
      throw new Error(`${label}.repo must be a GitHub owner/repository identifier`);
    }
    const canonicalRepo = repo.toLowerCase();
    if (repositories.has(canonicalRepo)) throw new Error(`duplicate repository ${repo}`);
    repositories.add(canonicalRepo);

    const category = safeString(project.category, `${label}.category`, { max: 32 });
    if (!CATEGORIES.includes(category)) {
      throw new Error(`${label}.category must be one of ${CATEGORIES.join(", ")}`);
    }
    const summary = safeString(project.summary, `${label}.summary`, {
      min: 20,
      max: 240,
    });
    if (!summary.endsWith(".")) throw new Error(`${label}.summary must end with a period`);

    const normalized = {
      repo,
      category,
      summary,
      platforms: labels(project.platforms, `${label}.platforms`),
      tags: labels(project.tags, `${label}.tags`),
    };
    const normalizedEvidence = evidence(project.evidence, `${label}.evidence`);
    if (normalizedEvidence) normalized.evidence = normalizedEvidence;
    return normalized;
  });

  return { version: 1, projects };
}

export async function loadCatalog(path) {
  let raw;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`cannot read catalog JSON: ${error.message}`, { cause: error });
  }
  return validateCatalog(raw);
}
