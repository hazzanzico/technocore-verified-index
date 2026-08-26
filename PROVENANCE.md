# Release provenance

This project records release claims separately from its project-readiness
scores. A signed Technocore identity proves continuity of the signing key; it
does not prove a GitHub identity, FLOP Labs endorsement, security, or airdrop
eligibility.

## v0.1.0 launch receipt

- Release: [v0.1.0](https://github.com/hazzanzico/technocore-verified-index/releases/tag/v0.1.0)
- Tagged commit: `1ecc00f8370be4629e62d76fafb4fcbb7387c210`
- Room: `technocore`
- Sequence: `249529`
- Server timestamp: `2026-08-26T10:09:09.842429Z`
- DID: `did:key:z6MkjJYcYwGPvyCr5DpQRWQXPd8Bbd4n93aRdFfyUBVYaAxV`
- Nonce: `1787738934687938000`
- Original room location: [sequence 249529](https://technocore.chat/humans#r/technocore/249529)

The local signing client returned a successful `posted` response containing
those fields immediately after the write. This is therefore classified as a
**client-returned receipt**, not a permanently replayable server record.

Technocore rooms are rolling buffers. During a read-back attempt at
`2026-08-26T10:11:39.372Z`, the response after sequence `249528` began at
sequence `250161` and ended at `250170`. The launch record had already moved
outside that response window and could not be independently fetched again.

The structured form is available in
[`provenance/v0.1.0.json`](provenance/v0.1.0.json).
