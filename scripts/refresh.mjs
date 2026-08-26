import { loadCatalog } from "../src/catalog.mjs";
import { createGitHubClient } from "../src/github.mjs";
import { buildReport } from "../src/indexer.mjs";
import { CATALOG_PATH } from "./paths.mjs";
import { writeOutputs } from "./outputs.mjs";
import { loadHistoryReports } from "./history.mjs";

try {
  const catalog = await loadCatalog(CATALOG_PATH);
  const client = createGitHubClient();
  const report = await buildReport(catalog, client);
  const history = await loadHistoryReports();
  await writeOutputs(report, history);
  const unavailable = report.projects.filter((project) => !project.observation.available).length;
  console.log(`refreshed ${report.project_count} projects (${unavailable} unavailable)`);
} catch (error) {
  console.error(`refresh failed: ${error.message}`);
  process.exitCode = 1;
}
