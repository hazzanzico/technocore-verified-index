# Contributing

Add or update one object in `catalog/projects.json`. Do not edit generated
reports, the generated README table, or the site by hand.

An entry must:

- directly integrate with, test, document, monitor, or extend Technocore;
- use a public GitHub repository and an open-source license;
- provide a neutral single-line summary;
- use only the documented categories, platforms, and tags;
- avoid airdrop promises, unsupported security claims, and official affiliation;
- never request a wallet seed, Technocore seed, identity file, or passphrase.

Optional `evidence.protocol_path` must be a relative path inside the same
repository. Optional `evidence.live_record` must be an HTTPS record on
`technocore.chat`. These fields improve traceability but do not prove safety.

Before opening a pull request:

```console
npm ci
npm run ci
```

Scheduled automation refreshes network observations after a catalog change is
merged. Contributors are not asked to run third-party code or provide secrets.
