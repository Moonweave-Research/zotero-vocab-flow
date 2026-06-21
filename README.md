# Zotero Vocab Flow

[![CI](https://github.com/Moonweave-Research/zotero-vocab-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/Moonweave-Research/zotero-vocab-flow/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Moonweave-Research/zotero-vocab-flow?include_prereleases&label=release)](https://github.com/Moonweave-Research/zotero-vocab-flow/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zotero 9](https://img.shields.io/badge/Zotero-9.0-blue)](addon/manifest.json)

Zotero Vocab Flow is a Zotero 9 plugin that turns intentional PDF underline annotations into reviewable vocabulary candidates, then saves selected terms into a clean vocabulary note.

Current release: `v0.1.3-beta.1`. This is a prerelease for researcher workflow validation, not a stable public release.

## Why It Exists

Research underlines are noisy. Some underlines mark important sentences, some mark terms to learn, and some are just reading traces. Vocab Flow keeps those separated by using a candidate-review stage before anything becomes a final vocab list.

## What It Does

- Extracts candidates from selected underline colors, a `vocab` annotation tag, or all underlines.
- Creates a `단어장 후보 (...)` candidate note for review before translation.
- Preserves excluded candidates across reruns.
- Saves approved candidates into one generated `단어장 (...)` note per Zotero item.
- Keeps manually entered Korean meanings when regenerating or filling blanks.
- Offers opt-in translation aids only after review: inaccurate free `google-free`, OpenAI-compatible BYO API gateways, direct Gemini BYO API, or direct Claude/Anthropic BYO API.

## Workflow

1. Mark vocabulary-worthy terms with a chosen underline color or the `vocab` annotation tag.
2. Run `Vocab Flow` -> a `term candidates` command.
3. Review the generated `단어장 후보 (...)` note.
4. Change unwanted rows from `저장` to `제외` or `x`.
5. Run `selected candidates로 단어장 만들기`.
6. Fill `한국어 뜻 (Korean meaning)` manually, or use an optional translation aid after review.

## Install

1. Download `zotero-vocab-flow.xpi` from the latest GitHub prerelease: [v0.1.3-beta.1](https://github.com/Moonweave-Research/zotero-vocab-flow/releases/tag/v0.1.3-beta.1).
2. In Zotero, open `Tools` -> `Plugins`.
3. Click the gear menu and choose `Install Plugin From File`.
4. Select the XPI and restart Zotero if prompted.

For local development:

```bash
npm install
npm run build
```

The build creates `zotero-vocab-flow.xpi`.

## Development

```bash
npm install
npm run test:unit
npm run typecheck
npm run build
npm run release:check
```

`npm run release:check` runs the unit suite, TypeScript check, XPI build, release-surface validation, and icon/package checks.

## Translation Aid

Translation is not the core product promise. It is an optional aid.

- It is disabled by default.
- It only fills blank `Korean meaning` cells.
- It preserves manually entered meanings.
- The `google-free` provider is an inaccurate free aid. It sends terms without source context, may be blocked or rate-limited, and must be reviewed manually.
- The OpenAI-compatible BYO API provider sends terms to the endpoint you configure. Use this for OpenAI, OpenRouter, LiteLLM, local proxies, and other Chat Completions-compatible gateways. You can choose whether stored underline context is sent with each term.
- The Gemini BYO API provider sends terms directly to a Gemini `generateContent` endpoint.
- The Claude/Anthropic BYO API provider sends terms directly to Anthropic's Messages API.
- BYO API keys are stored in Zotero preferences on this machine.
- Terms and optional context can be sent to external services when a translation aid is enabled.

## Data Safety

- Vocab Flow only updates or trashes notes with its generated-note ownership markers.
- User notes that merely reuse `_vocab-extract` or `_vocab-candidates` tags are ignored unless they also contain Vocab Flow ownership markers.
- Generated candidate notes are trashed only after accepted candidates are successfully written into the final wordbook note.
- Translation never runs automatically during candidate generation or acceptance.

## Release Status

Current release: `v0.1.3-beta.1`

Verified:

- `npm run release:check` -> passing. This includes unit tests, TypeScript check, XPI build, XPI manifest/version validation, update manifest validation, and XPI SHA-256 validation.
- New Gemini and Claude/Anthropic provider request paths are covered by mocked API-shape tests; no paid live provider call is required for this prerelease gate.
- Existing core Zotero runtime validation covers menu loading, all six annotation colors, candidate generation, accept flow, OpenAI-compatible BYO callback against a localhost mock endpoint, cleanup, installed XPI hash match, and DB read-only cleanup checks.

Known limits:

- Candidate quality is heuristic, though representative paper underline fixtures now cover materials, biomedical, and machine-learning prose.
- Existing v0.1.0-beta.1 installs need one manual v0.1.1-beta.1 or newer install before future Zotero update checks can use the real update manifest.

## Documentation

- [Install Guide](docs/INSTALL.md)
- [Usage Guide](docs/USAGE.md)
- [Product Spec](docs/SPEC.md)
- [Release Notes](docs/RELEASE_NOTES_v0.1.3-beta.md)
- [Release Process](docs/RELEASE_PROCESS.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before filing security-sensitive issues.

## License

MIT
