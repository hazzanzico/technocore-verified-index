import { loadCatalog } from "../src/catalog.mjs";
import { createGitHubClient } from "../src/github.mjs";
import { buildReport } from "../src/indexer.mjs";
import { CATALOG_PATH } from "./paths.mjs";
import { writeOutputs } from "./outputs.mjs";

try {
  const catalog = await loadCatalog(CATALOG_PATH);
  const client = createGitHubClient();
  const report = await buildReport(catalog, client);
  await writeOutputs(report);
  const unavailable = report.projects.filter((project) => !project.observation.available).length;
  console.log(`refreshed ${report.project_count} projects (${unavailable} unavailable)`);
} catch (error) {
  console.error(`refresh failed: ${error.message}`);
  process.exitCode = 1;
}
