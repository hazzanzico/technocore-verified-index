import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { validateReport } from "../src/indexer.mjs";
import { ROOT } from "./paths.mjs";

const HISTORY_DIRECTORY = join(ROOT, "reports", "history");

export async function loadHistoryReports() {
  let names;
  try {
    names = await readdir(HISTORY_DIRECTORY);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const selected = names
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .slice(-365);
  return Promise.all(
    selected.map(async (name) =>
      validateReport(JSON.parse(await readFile(join(HISTORY_DIRECTORY, name), "utf8"))),
    ),
  );
}
