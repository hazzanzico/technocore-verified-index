import { readFile } from "node:fs/promises";
import { loadCatalog } from "../src/catalog.mjs";
import { validateReport } from "../src/indexer.mjs";
import { scoreRuleTotal } from "../src/render.mjs";
import {
  CATALOG_PATH,
  CATALOG_SCHEMA_PATH,
  PROVENANCE_PATH,
  PROVENANCE_SCHEMA_PATH,
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

function validateProvenance(provenance) {
  if (provenance?.schema !== "technocore-verified-index-provenance-v1") {
    throw new Error("provenance has an unsupported schema");
  }
  if (!/^v\d+\.\d+\.\d+$/.test(provenance.release?.tag ?? "")) {
    throw new Error("provenance release tag is invalid");
  }
  if (!/^[0-9a-f]{40}$/.test(provenance.release?.commit ?? "")) {
    throw new Error("provenance release commit is invalid");
  }
  const receipt = provenance.technocore;
  if (receipt?.receipt_source !== "client-returned" || receipt.room !== "technocore") {
    throw new Error("provenance receipt classification is invalid");
  }
  if (!Number.isSafeInteger(receipt.seq) || receipt.seq < 1) {
    throw new Error("provenance sequence is invalid");
  }
  if (!/^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]+$/.test(receipt.did ?? "")) {
    throw new Error("provenance DID is invalid");
  }
  if (!/^\d+$/.test(receipt.nonce ?? "") || Number.isNaN(Date.parse(receipt.ts))) {
    throw new Error("provenance nonce or timestamp is invalid");
  }
  const retention = provenance.retention_check;
  if (
    retention?.outcome !== "outside-current-room-window" ||
    !Number.isSafeInteger(retention.first_seq) ||
    !Number.isSafeInteger(retention.last_seq) ||
    retention.first_seq <= receipt.seq ||
    retention.last_seq < retention.first_seq
  ) {
    throw new Error("provenance retention check is inconsistent");
  }
  return provenance;
}

try {
  const [catalog, reportText, provenanceText] = await Promise.all([
    loadCatalog(CATALOG_PATH),
    readFile(REPORT_PATH, "utf8"),
    readFile(PROVENANCE_PATH, "utf8"),
    loadSchema(CATALOG_SCHEMA_PATH, "Technocore Verified Index catalog"),
    loadSchema(PROVENANCE_SCHEMA_PATH, "Technocore Verified Index provenance"),
    loadSchema(REPORT_SCHEMA_PATH, "Technocore Verified Index report"),
  ]);
  const report = validateReport(JSON.parse(reportText));
  const provenance = validateProvenance(JSON.parse(provenanceText));
  const catalogRepos = catalog.projects.map((project) => project.repo).sort();
  const reportRepos = report.projects.map((project) => project.repo).sort();
  if (JSON.stringify(catalogRepos) !== JSON.stringify(reportRepos)) {
    throw new Error("saved report does not contain exactly the catalogued repositories");
  }
  if (scoreRuleTotal() !== 100) throw new Error("evidence rules must total 100 percentage points");
  console.log(
    `valid catalog, report, and ${provenance.release.tag} provenance: ${catalog.projects.length} projects, 10 equal evidence signals`,
  );
} catch (error) {
  console.error(`validation failed: ${error.message}`);
  process.exitCode = 1;
}
