import { readFile } from "node:fs/promises";
import { loadCatalog } from "../src/catalog.mjs";
import { validateReport } from "../src/indexer.mjs";
import { scoreRuleTotal } from "../src/render.mjs";
import {
  CATALOG_PATH,
  CATALOG_SCHEMA_PATH,
  REPORT_PATH,
  REPORT_SCHEMA_PATH,
} from "./paths.mjs";

const SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

async function loadSchema(path, expectedTitle) {
  const schema = JSON.parse(await readFile(path, "utf8"));
  if (schema.$schema !== SCHEMA_DIALECT) {
    throw new Error(`${expectedTitle} must declare JSON Schema 2020-12`);
  }
  if (schema.title !== expectedTitle) {
    throw new Error(`${path} has an unexpected title`);
  }
  return schema;
}

try {
  const [catalog, reportText] = await Promise.all([
    loadCatalog(CATALOG_PATH),
    readFile(REPORT_PATH, "utf8"),
    loadSchema(CATALOG_SCHEMA_PATH, "Technocore Verified Index catalog"),
    loadSchema(REPORT_SCHEMA_PATH, "Technocore Verified Index report"),
  ]);
  const report = validateReport(JSON.parse(reportText));
  const catalogRepos = catalog.projects.map((project) => project.repo).sort();
  const reportRepos = report.projects.map((project) => project.repo).sort();
  if (JSON.stringify(catalogRepos) !== JSON.stringify(reportRepos)) {
    throw new Error("saved report does not contain exactly the catalogued repositories");
  }
  if (scoreRuleTotal() !== 100) throw new Error("readiness rules must total 100 points");
  console.log(`valid catalog and report: ${catalog.projects.length} projects, 100-point rubric`);
} catch (error) {
  console.error(`validation failed: ${error.message}`);
  process.exitCode = 1;
}
