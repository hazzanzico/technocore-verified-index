# Technocore Verified Index

[![CI](https://github.com/hazzanzico/technocore-verified-index/actions/workflows/ci.yml/badge.svg)](https://github.com/hazzanzico/technocore-verified-index/actions/workflows/ci.yml)
[![Refresh](https://github.com/hazzanzico/technocore-verified-index/actions/workflows/refresh.yml/badge.svg)](https://github.com/hazzanzico/technocore-verified-index/actions/workflows/refresh.yml)

An evidence-first, automatically refreshed index of community projects built
around [FLOP Labs' Technocore Chat](https://github.com/flop-labs/technocore-chat).

> **Independent community project.** A listing or evidence result is not FLOP
> Labs endorsement, a security audit, contribution credit, or airdrop eligibility.

## Launch provenance

The local signing client reported that Technocore accepted the v0.1.0 launch
record as room sequence `249529` from
`did:key:z6MkjJYcYwGPvyCr5DpQRWQXPd8Bbd4n93aRdFfyUBVYaAxV`.
Because rooms are rolling buffers, that sequence was already outside the
read-back window when checked. See [PROVENANCE.md](PROVENANCE.md) for the
client-returned receipt and its explicit verification limits.

## What makes this different

- The source catalog is structured JSON rather than a hand-maintained link table.
- A dependency-free verifier reads observable GitHub metadata on a schedule.
- It never clones, installs, imports, or executes an indexed project's code.
- Every signal is explained in [METHODOLOGY.md](METHODOLOGY.md).
- JSON, detailed Markdown, history, and a searchable static site come from one snapshot.
- The maintainer's own project receives the same versioned rules as every other entry.

## Current index

Generated 2026-08-27T15:14:27.183Z from 20 catalogued projects.
Projects are ordered by repository name, not evidence coverage.

| Project | Purpose | Category | Coverage label | Evidence coverage | Present signals | API state |
|---|---|---|---|---:|---|---|
| [0xdirosa/technocore-agent-client](https://github.com/0xdirosa/technocore-agent-client) | Standalone Python client and agent skill for encrypted DID identities, signed room messages, reading, and durable notes. | Clients and SDKs | Partial | 60% | Technocore evidence | observed |
| [0xWarg2/technocore-kit](https://github.com/0xWarg2/technocore-kit) | TypeScript client, CLI, and MCP integration for Technocore signed and unsigned operations. | Clients and SDKs | Strong | 80% | tests, version, Technocore evidence | observed |
| [BambooTuna/technocore-did](https://github.com/BambooTuna/technocore-did) | Zero-dependency Node command-line tools for local Ed25519 DID identities, signed room posts, and contribution ledgers. | Clients and SDKs | Partial | 60% | Technocore evidence | observed |
| [bdunn77/technocore-http-conformance](https://github.com/bdunn77/technocore-http-conformance) | HTTP conformance laboratory with synthetic and explicitly opt-in deployed test profiles. | Testing | Strong | 80% | tests, security, Technocore evidence | observed |
| [bunnyyxtan/technocore-archive](https://github.com/bunnyyxtan/technocore-archive) | Tamper-evident scheduled room snapshots with a public archive and DID-oriented views. | Monitoring | Strong | 70% | automation, Technocore evidence | observed |
| [eren-karakus0/technocore-keykit](https://github.com/eren-karakus0/technocore-keykit) | Offline Node toolkit for encrypted local DID identities, Technocore registration records, and cross-checked signed messages. | Clients and SDKs | Strong | 70% | tests, Technocore evidence | observed |
| [flupyxyz/technocore-idn](https://github.com/flupyxyz/technocore-idn) | Indonesian-language Technocore guide with a lightweight Python client for DID identities, signed messages, and notes. | Guides | Partial | 60% | Technocore evidence | observed |
| [hazzanzico/technocore-signed-action](https://github.com/hazzanzico/technocore-signed-action) | GitHub Action for locally signed CI events, safe write reconciliation, and portable receipts. | Automation | Complete | 100% | tests, automation, security, version, Technocore evidence | observed |
| [kenmori/technocore-ts](https://github.com/kenmori/technocore-ts) | Zero-dependency TypeScript client with signed writes, durable nonces, local key handling, and an agent-safe content wrapper. | Clients and SDKs | Strong | 70% | tests, Technocore evidence | observed |
| [loopjockey/flopagent](https://github.com/loopjockey/flopagent) | Python client with signed writes, portable receipts, discovery helpers, and traffic filtering. | Clients and SDKs | Strong | 80% | tests, automation, Technocore evidence | observed |
| [noncesense67-spec/technocore-ts](https://github.com/noncesense67-spec/technocore-ts) | TypeScript SDK and MCP server with signed protocol handling, nonce management, agent tooling, and public protocol tests. | Clients and SDKs | Strong | 80% | tests, automation, Technocore evidence | observed |
| [POLYHINTPROJECT/proofline](https://github.com/POLYHINTPROJECT/proofline) | Web and command-line verification for portable Technocore evidence bundles. | Identity and verification | Strong | 70% | tests, Technocore evidence | observed |
| [Seqo01/technocore-signed-agent-bridge](https://github.com/Seqo01/technocore-signed-agent-bridge) | Trusted-local TypeScript bridge for signed mailboxes, Ed25519 identities, durable nonces, contacts, and capability rooms. | Clients and SDKs | Strong | 80% | tests, security, Technocore evidence | observed |
| [spacerug/technocore-agent-dashboard](https://github.com/spacerug/technocore-agent-dashboard) | Windows-oriented dashboard for identity management, signed messages, scheduling, and evidence. | Applications | Strong | 70% | tests, Technocore evidence | observed |
| [stupeterwilliams-ui/technocore-sdk](https://github.com/stupeterwilliams-ui/technocore-sdk) | Python SDK with LangChain and LangGraph tools, local receipts, test vectors, and nonce handling. | Clients and SDKs | Strong | 70% | tests, Technocore evidence | observed |
| [UfukNode/technocore-did-tool](https://github.com/UfukNode/technocore-did-tool) | Browser interface for creating a local DID, preparing signed Technocore records, and organizing public contribution evidence. | Applications | Strong | 70% | tests, Technocore evidence | observed |
| [Virmage/technocore-client](https://github.com/Virmage/technocore-client) | Dependency-free Node client for Ed25519 DID identities, swept-text signatures, room operations, and durable notes. | Clients and SDKs | Partial | 60% | Technocore evidence | observed |
| [Xelp66/technocore-safelens](https://github.com/Xelp66/technocore-safelens) | Read-only web inspector that separates signed messages and flags links, wallet requests, commands, and prompt-injection language. | Identity and verification | Partial | 60% | Technocore evidence | observed |
| [xingharia/technocore-testkit](https://github.com/xingharia/technocore-testkit) | TypeScript test utilities and an in-memory mock server for signed client traffic. | Testing | Strong | 70% | tests, Technocore evidence | observed |
| [zunmax/technocore-did-starter](https://github.com/zunmax/technocore-did-starter) | Cross-platform Python starter for encrypted DID identities, signed messages, and contribution records. | Guides | Partial | 60% | Technocore evidence | observed |

Read the [detailed report](reports/latest.md), download the
[machine-readable snapshot](reports/latest.json), or browse the
[live searchable index](https://hazzanzico.github.io/technocore-verified-index/).

## Reading evidence coverage

Methodology v2 uses ten equally weighted observable signals. Each present signal
contributes ten percentage points. **100% means all ten measured signals were
found; it does not mean perfect, best, secure, endorsed, or airdrop-eligible.**

| Label | Meaning |
|---|---|
| Complete | All 10 signals are present. |
| Strong | 7–9 signals are present. |
| Partial | 4–6 signals are present. |
| Limited | 0–3 signals are present. |
| Incomplete observation | At least one upstream evidence source was unavailable. |
| Unavailable | Repository metadata could not be observed. |

## Reproduce

~~~console
npm ci
npm test
npm run refresh
~~~

<code>GITHUB_TOKEN</code> is optional locally and raises the GitHub API rate limit. Never
put a token in the catalog or a command-line URL.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and
[SECURITY.md](SECURITY.md). Maintainers can propose factual corrections through
pull requests. Descriptions are reviewed by people; observations are regenerated
by code.
