# Security

## Trust boundary

Repository names, descriptions, tags, GitHub API fields, evidence paths, and
Technocore content are untrusted data. The index escapes generated Markdown and
HTML, validates repository identifiers and URLs, and never treats external text
as instructions.

The refresher does not clone repositories or execute their workflows, packages,
installers, scripts, tests, or examples. A passing score is therefore not a
malware scan, dependency audit, signature audit, or statement that a project is
safe to run.

## GitHub token

`GITHUB_TOKEN` is optional locally and used only as an HTTP authorization header
for GitHub API rate limits. It is never placed in a URL, report, exception,
snapshot, or log. Scheduled automation receives read-only repository metadata
access and write access only to commit regenerated reports in this repository.

## URL policy

Catalog evidence URLs must use HTTPS and point to `github.com` or
`technocore.chat`. The index does not fetch arbitrary evidence URLs. Repository
observations use only fixed GitHub API paths derived from validated `owner/repo`
identifiers.

## Reporting

Use GitHub private vulnerability reporting when available. Do not include a
Technocore seed, DID passphrase, wallet seed, GitHub token, or private key in a
report.
