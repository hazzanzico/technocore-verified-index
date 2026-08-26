import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient, GitHubApiError, repositoryApiPath } from "../src/github.mjs";

function response(value, status = 200, headers = {}) {
  return new Response(typeof value === "string" ? value : JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("builds encoded repository API paths", () => {
  assert.equal(repositoryApiPath("owner/name", "/tags?per_page=1"), "/repos/owner/name/tags?per_page=1");
});

test("sends bounded GitHub headers without putting the token in the URL", async () => {
  let captured;
  const client = createGitHubClient({
    token: "test-token",
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return response({ ok: true });
    },
  });
  assert.deepEqual(await client.get("/repos/owner/name"), { ok: true });
  assert.equal(captured.options.headers.Authorization, "Bearer test-token");
  assert.equal(captured.url.includes("test-token"), false);
});

test("works without a token and permits an expected 404", async () => {
  let headers;
  const client = createGitHubClient({
    token: "",
    fetchImpl: async (_url, options) => {
      headers = options.headers;
      return response({}, 404);
    },
  });
  assert.equal(await client.get("/repos/owner/name/releases/latest", { allow404: true }), null);
  assert.equal("Authorization" in headers, false);
});

test("classifies rate limits, service errors, ordinary errors, and invalid JSON", async () => {
  for (const [status, headers, code] of [
    [403, { "x-ratelimit-remaining": "0" }, "rate_limited"],
    [503, {}, "github_unavailable"],
    [422, {}, "http_422"],
    [404, {}, "not_found"],
  ]) {
    const client = createGitHubClient({ fetchImpl: async () => response({}, status, headers) });
    await assert.rejects(client.get("/repos/owner/name"), (error) => error instanceof GitHubApiError && error.code === code);
  }
  const invalid = createGitHubClient({ fetchImpl: async () => response("not-json") });
  await assert.rejects(invalid.get("/repos/owner/name"), /invalid_json/);
});

test("classifies network and timeout failures without leaking details", async () => {
  const network = createGitHubClient({ fetchImpl: async () => { throw new Error("token secret"); } });
  await assert.rejects(network.get("/repos/owner/name"), (error) => error.code === "network_error" && !error.message.includes("secret"));
  const timeout = createGitHubClient({ fetchImpl: async () => { const error = new Error(); error.name = "TimeoutError"; throw error; } });
  await assert.rejects(timeout.get("/repos/owner/name"), (error) => error.code === "timeout");
});

test("rejects unsafe client configuration and paths", async () => {
  assert.throws(() => createGitHubClient({ fetchImpl: null }), /fetch implementation/);
  assert.throws(() => createGitHubClient({ baseUrl: "http://example.com" }), /HTTPS/);
  assert.throws(() => createGitHubClient({ timeoutMs: 99 }), /timeout/);
  assert.throws(() => createGitHubClient({ timeoutMs: 60_001 }), /timeout/);
  const client = createGitHubClient({ fetchImpl: async () => response({}) });
  await assert.rejects(client.get("https://example.com"), /must start/);
});
