# Verification methodology

Technocore Verified Index reports observable repository evidence. It does not
certify code safety, protocol correctness, authorship, project quality, or FLOP
Labs endorsement.

## Evidence model

The refresher reads public GitHub API metadata and repository trees. It never
clones, installs, imports, or executes catalogued project code. Every observation
records its check time and can be reproduced from the generated JSON report.
Daily snapshots are retained under `reports/history/` so changes remain
auditable.

The catalog provides human-reviewed descriptions and classifications. Those
fields are treated as untrusted strings by the renderer and never influence a
repository's evidence coverage.

## Observable Evidence Coverage

Methodology 2.0 replaces weighted readiness grades with ten equally weighted
observable signals. Each present signal contributes ten percentage points.

| Group | Signal | Present when |
|---|---|---|
| Availability | Repository accessible | GitHub returned current repository metadata. |
| Maintenance | Repository active | GitHub does not mark the repository archived. |
| Documentation | Recognized license | GitHub reports a recognized SPDX license. |
| Documentation | Root README | A root README is present. |
| Testing and automation | Test evidence | A conventional test path or test filename is present. |
| Testing and automation | Latest automation passed | The latest completed GitHub Actions run succeeded. |
| Security | Security policy | A root `SECURITY.md` is present. |
| Release | Version marker | At least one GitHub release or Git tag exists. |
| Technocore | Technocore evidence path | The catalogued protocol-evidence path exists. |
| Maintenance | Recent activity | The repository was pushed within the previous 180 days. |

Every signal has one of three states:

- **Present:** the documented evidence was observed.
- **Missing:** its upstream source was available, but the evidence was not found.
- **Unavailable:** the required upstream source could not be evaluated.

An unavailable signal is not silently presented as missing. Repository-level
unavailability produces no percentage. Partial upstream outages retain the
percentage of present signals while the descriptive label becomes **Incomplete
observation**.

## Descriptive labels

| Label | Meaning |
|---|---|
| Complete | All 10 signals are present. |
| Strong | 7–9 signals are present. |
| Partial | 4–6 signals are present. |
| Limited | 0–3 signals are present. |
| Incomplete observation | At least one required evidence source was unavailable. |
| Unavailable | Repository metadata could not be observed. |

These labels describe evidence coverage, not project quality. **100% means all
ten measured signals were found. It does not mean perfect, best, secure,
endorsed, maintained forever, or eligible for an airdrop.** A small stable tool
may intentionally omit several signals, while a project with complete evidence
may still contain vulnerabilities or incorrect behavior.

## Evidence links

When an exact path or GitHub observation URL is available, generated reports and
project details link directly to it. Links are restricted to HTTPS GitHub URLs.
The presence of a file proves only that the file exists, not that its contents
are correct or sufficient.

## Failure handling

An unavailable repository response never becomes a failing-project verdict. The
report records a safe error category without including authorization headers,
response bodies, or other potentially sensitive diagnostics. An optional tree,
automation, release, or tag endpoint failure is shown as a warning and makes
dependent signals unavailable until a later refresh.

## Machine-readable contracts

The source catalog and generated report formats are documented by JSON Schemas
in `schemas/`. Report schema v2 and methodology 2.0 introduce equal signal
weights, explicit evidence states, and descriptive labels. Runtime validation is
implemented without third-party packages, and tests keep the enforced
boundaries aligned with those schemas.

## Independence and ordering

This is an independent community project. FLOP Labs does not operate it, and
listing or coverage does not establish contribution credit, airdrop eligibility,
security review, or endorsement. The default order is alphabetical. Stars,
forks, maintainer identity, and popularity never affect coverage.
