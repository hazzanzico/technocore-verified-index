import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CATALOG_PATH = join(ROOT, "catalog", "projects.json");
export const CATALOG_SCHEMA_PATH = join(ROOT, "schemas", "catalog.schema.json");
export const REPORT_PATH = join(ROOT, "reports", "latest.json");
export const REPORT_SCHEMA_PATH = join(ROOT, "schemas", "report.schema.json");
export const REPORT_MARKDOWN_PATH = join(ROOT, "reports", "latest.md");
export const README_PATH = join(ROOT, "README.md");
export const SITE_PATH = join(ROOT, "site", "index.html");
