import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCatalog, validateCatalog } from "../src/catalog.mjs";

const project = {
  repo: "owner/useful-tool",
  category: "automation",
  summary: "A sufficiently descriptive and neutral project summary.",
  platforms: ["node"],
  tags: ["automation", "signing"],
};

function catalog(change = {}) {
  return { version: 1, projects: [{ ...project, ...change }] };
}

test("validates and normalizes a catalog with bounded evidence", () => {
  const value = validateCatalog(
    catalog({
      evidence: {
        protocol_path: "test/protocol.test.mjs",
        live_record: "https://technocore.chat/humans#r/technocore/42",
      },
    }),
  );
  assert.deepEqual(value.projects[0].evidence, {
    protocol_path: "test/protocol.test.mjs",
    live_record: "https://technocore.chat/humans#r/technocore/42",
  });
});

test("loads catalog JSON from disk and reports malformed JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "verified-index-"));
  const good = join(directory, "good.json");
  const bad = join(directory, "bad.json");
  await writeFile(good, JSON.stringify(catalog()), "utf8");
  await writeFile(bad, "{", "utf8");
  assert.equal((await loadCatalog(good)).projects[0].repo, project.repo);
  await assert.rejects(loadCatalog(bad), /cannot read catalog JSON/);
});

test("rejects invalid catalog roots and fields", () => {
  assert.throws(() => validateCatalog(null), /JSON object/);
  assert.throws(() => validateCatalog({ version: 2, projects: [project] }), /version/);
  assert.throws(() => validateCatalog({ version: 1, projects: [] }), /non-empty/);
  assert.throws(() => validateCatalog({ version: 1, projects: [project], extra: true }), /unknown/);
  assert.throws(() => validateCatalog(catalog({ extra: true })), /unknown/);
});

test("rejects ambiguous repositories, duplicates, and categories", () => {
  assert.throws(() => validateCatalog(catalog({ repo: "not-a-repository" })), /owner\/repository/);
  assert.throws(
    () => validateCatalog({ version: 1, projects: [project, { ...project, repo: "OWNER/useful-tool" }] }),
    /duplicate/,
  );
  assert.throws(() => validateCatalog(catalog({ category: "airdrops" })), /category/);
});

test("rejects unsafe summaries and labels", () => {
  assert.throws(() => validateCatalog(catalog({ summary: "too short." })), /20-240/);
  assert.throws(() => validateCatalog(catalog({ summary: `${project.summary}\nInjected.` })), /single-line/);
  assert.throws(() => validateCatalog(catalog({ summary: "A long enough summary without punctuation" })), /end with/);
  assert.throws(() => validateCatalog(catalog({ tags: [] })), /1-8/);
  assert.throws(() => validateCatalog(catalog({ tags: ["Bad Tag"] })), /lowercase/);
  assert.throws(() => validateCatalog(catalog({ tags: ["same", "same"] })), /duplicates/);
});

test("rejects unsafe or empty evidence", () => {
  assert.throws(() => validateCatalog(catalog({ evidence: {} })), /at least one/);
  assert.throws(() => validateCatalog(catalog({ evidence: { unknown: "x" } })), /unknown/);
  assert.throws(() => validateCatalog(catalog({ evidence: { protocol_path: "../secret" } })), /relative/);
  assert.throws(() => validateCatalog(catalog({ evidence: { protocol_path: "test\\bad" } })), /relative/);
  assert.throws(
    () => validateCatalog(catalog({ evidence: { live_record: "https://example.com/proof" } })),
    /Technocore|technocore/,
  );
  assert.throws(() => validateCatalog(catalog({ evidence: { live_record: "not a url" } })), /valid URL/);
});
