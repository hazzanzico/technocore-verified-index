import { readFile } from "node:fs/promises";
import { validateReport } from "../src/indexer.mjs";
import { REPORT_PATH } from "./paths.mjs";
import { writeOutputs } from "./outputs.mjs";
import { loadHistoryReports } from "./history.mjs";

try {
  const report = validateReport(JSON.parse(await readFile(REPORT_PATH, "utf8")));
  const history = await loadHistoryReports();
  await writeOutputs(report, history);
  console.log(`rendered ${report.project_count} projects from the saved snapshot`);
} catch (error) {
  console.error(`render failed: ${error.message}`);
  process.exitCode = 1;
}
