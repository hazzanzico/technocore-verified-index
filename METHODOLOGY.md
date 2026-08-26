# Verification methodology

Technocore Verified Index reports observable repository-maintenance signals. It
does not certify code safety, protocol correctness, authorship, or FLOP Labs
endorsement.

## Evidence model

The refresher reads public GitHub API metadata and repository trees. It never
clones, installs, imports, or executes catalogued project code. Every observation
records its check time and can be reproduced from the generated JSON report.
Daily snapshots are retained under `reports/history/` so changes remain auditable.

The catalog provides human-reviewed descriptions and classifications. Those
fields are treated as untrusted strings by the renderer and never influence a
repository's observed facts.

## Readiness score

The score is a compact summary of ten checks, not a ranking of project quality:

| Check | Points | Passing observation |
|---|---:|---|
| Repository accessible | 15 | GitHub returned current repository metadata. |
| Not archived | 10 | GitHub does not mark the repository archived. |
| Open-source license | 10 | GitHub reports a recognized SPDX license. |
| README | 10 | A root README is present. |
| Tests | 10 | A conventional test path or test filename is present. |
| Passing automation | 15 | The latest completed GitHub Actions run succeeded. |
| Security policy | 10 | A root `SECURITY.md` is present. |
| Version marker | 10 | At least one GitHub release or Git tag exists. |
| Protocol evidence | 5 | A catalogued protocol-evidence path exists in the repository tree. |
| Recent activity | 5 | The repository was pushed within the previous 180 days. |

Grades are A (85–100), B (70–84), C (50–69), and D (0–49). `U` means the
repository API was unavailable and the project was deliberately left unscored. A lower grade can
describe a small, stable project rather than a broken one. A higher grade can
still contain vulnerabilities or incorrect protocol behavior. Read the detailed
checks and the upstream project before using anything.

## Failure handling

An unavailable repository response never becomes a failing project verdict. The
report assigns `U` and preserves a safe error category without including
authorization headers, response bodies, or other potentially sensitive
diagnostics. An optional tree, automation, release, or tag endpoint failure is
shown as a warning and leaves dependent signals unobserved until a later refresh.

## Machine-readable contracts

The source catalog and generated report formats are documented by JSON Schemas in
`schemas/`. Runtime validation is intentionally implemented without third-party
packages, and tests keep the enforced boundaries aligned with those schemas.

## Independence

This is an independent community project. FLOP Labs does not operate it, and
listing or scoring does not establish contribution credit, airdrop eligibility,
security review, or endorsement.
