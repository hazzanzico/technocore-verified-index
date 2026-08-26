const DEFAULT_BASE_URL = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(code, status) {
    super(`GitHub API request failed: ${code}`);
    this.name = "GitHubApiError";
    this.code = code;
    this.status = status;
  }
}

function failureCode(response) {
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return "rate_limited";
  }
  if (response.status === 404) return "not_found";
  if (response.status >= 500) return "github_unavailable";
  return `http_${response.status}`;
}

export function createGitHubClient({
  token = process.env.GITHUB_TOKEN,
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = 15_000,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("a fetch implementation is required");
  const parsedBase = new URL(baseUrl);
  if (parsedBase.protocol !== "https:" && parsedBase.hostname !== "127.0.0.1") {
    throw new Error("GitHub API base URL must use HTTPS");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new Error("GitHub API timeout must be 100-60000 milliseconds");
  }

  return Object.freeze({
    async get(path, { allow404 = false } = {}) {
      if (typeof path !== "string" || !path.startsWith("/repos/")) {
        throw new Error("GitHub API path must start with /repos/");
      }
      const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "technocore-verified-index/0.1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      let response;
      try {
        response = await fetchImpl(new URL(path, parsedBase), {
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const code = error?.name === "TimeoutError" ? "timeout" : "network_error";
        throw new GitHubApiError(code, 0);
      }
      if (allow404 && response.status === 404) return null;
      if (!response.ok) throw new GitHubApiError(failureCode(response), response.status);
      try {
        return await response.json();
      } catch {
        throw new GitHubApiError("invalid_json", response.status);
      }
    },
  });
}

export function repositoryApiPath(repo, suffix = "") {
  const [owner, name] = repo.split("/");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${suffix}`;
}
