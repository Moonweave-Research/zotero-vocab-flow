# Contributing

Thanks for taking a look at Vocab Flow. This project is still a prerelease Zotero 9 plugin, so small, verifiable changes are preferred.

## Local Setup

```bash
npm install
npm run test:unit
npm run typecheck
npm run build
```

The build writes `zotero-vocab-flow.xpi` at the repository root. The XPI is a generated artifact and is intentionally ignored by git.

## Before Opening a Pull Request

Run:

```bash
npm run release:check
```

For behavior changes, add focused unit coverage. For Zotero-runtime behavior, describe what was manually verified, including Zotero version, platform, and the user-visible menu or note behavior.

## Product Boundaries

- Candidate review comes before translation.
- Translation aids must remain opt-in and must not overwrite manually entered meanings.
- The plugin must not update or trash user notes unless they contain Vocab Flow generated-note ownership markers.
- Public docs should avoid local machine paths, profile IDs, API keys, or private library details.

