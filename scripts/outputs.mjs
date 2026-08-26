import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  renderDetailedReport,
  renderHtml,
  renderReadme,
  serializeReport,
} from "../src/render.mjs";
import {
  README_PATH,
  REPORT_MARKDOWN_PATH,
  REPORT_PATH,
  SITE_PATH,
} from "./paths.mjs";

export async function writeOutputs(report, historyReports = []) {
  await Promise.all([
    mkdir(dirname(REPORT_PATH), { recursive: true }),
    mkdir(dirname(SITE_PATH), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(REPORT_PATH, serializeReport(report), "utf8"),
    writeFile(REPORT_MARKDOWN_PATH, renderDetailedReport(report), "utf8"),
    writeFile(README_PATH, renderReadme(report), "utf8"),
    writeFile(SITE_PATH, renderHtml(report, historyReports), "utf8"),
  ]);
}
