import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateReport } from "../src/indexer.mjs";
import { REPORT_PATH, ROOT } from "./paths.mjs";

try {
  const report = validateReport(JSON.parse(await readFile(REPORT_PATH, "utf8")));
  const date = report.generated_at.slice(0, 10);
  const destination = join(ROOT, "reports", "history", `${date}.json`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(REPORT_PATH, destination);
  console.log(`archived snapshot ${date}`);
} catch (error) {
  console.error(`archive failed: ${error.message}`);
  process.exitCode = 1;
}
