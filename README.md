# Zotero Vocab Flow

Zotero Vocab Flow is a Zotero 9 plugin that turns intentional PDF underline annotations into reviewable vocabulary candidates, then saves selected terms into a clean vocabulary note.

This is a `v0.1.0-beta.1` prerelease for local/researcher workflow validation, following the original `v0.1.0-beta`.

## Why It Exists

Research underlines are noisy. Some underlines mark important sentences, some mark terms to learn, and some are just reading traces. Vocab Flow keeps those separated by using a candidate-review stage before anything becomes a final vocab list.

## Workflow

1. Mark vocabulary-worthy terms with a chosen underline color or the `vocab` annotation tag.
2. Run `Vocab Flow` -> a `term candidates` command.
3. Review the generated `단어장 후보 (...)` note.
4. Change unwanted rows from `저장` to `제외` or `x`.
5. Run `selected candidates로 단어장 만들기`.
6. Fill `한국어 뜻 (Korean meaning)` manually, or use an optional translation aid after review.

## Main Features

- Color-specific extraction from green, yellow, blue, purple, red, or gray underline annotations.
- `vocab` annotation-tag extraction for users who need a semantic marker independent of color.
- Advanced all-underlines extraction for bulk review.
- Candidate notes with source context and `Review before translation` guidance.
- Exclusion persistence across candidate regeneration.
- Final vocab notes with `용어 (Term)` and `한국어 뜻 (Korean meaning)` columns.
- Optional translation aids that fill only blank Korean meanings after opt-in: inaccurate free `google-free`, or OpenAI-compatible BYO API.

## Install

1. Download or build `zotero-vocab-flow.xpi`.
2. In Zotero, open `Tools` -> `Plugins`.
3. Click the gear menu and choose `Install Plugin From File`.
4. Select the XPI and restart Zotero if prompted.

For local development:

```bash
npm install
npm run build
```

The build creates `zotero-vocab-flow.xpi`.

## Translation Aid

Translation is not the core product promise. It is an optional aid.

- It is disabled by default.
- It only fills blank `Korean meaning` cells.
- It preserves manually entered meanings.
- The `google-free` provider is an inaccurate free aid. It sends terms without source context, may be blocked or rate-limited, and must be reviewed manually.
- The OpenAI-compatible BYO API provider sends terms to the endpoint you configure. You can choose whether stored underline context is sent with each term.
- BYO API keys are stored in Zotero preferences on this machine.
- Terms and optional context can be sent to external services when a translation aid is enabled.

## Release Status

Current release: `v0.1.0-beta.1`

Verified:

- `npm run test:unit` -> 110/110 passing.
- `npm run typecheck` -> passing.
- `npm run release:check` -> passing.
- Zotero runtime validation for menu loading, green candidate generation, accept flow, OpenAI-compatible BYO callback against a localhost mock endpoint, cleanup, installed XPI hash match, and DB read-only cleanup checks.

Known limits:

- Candidate quality is heuristic.
- Runtime coverage is strongest for green/all-underlines workflows.
- Other color menus are registered and labeled, but need broader real-annotation fixtures before a stable public release.
- The manifest currently contains an inert `update_url` kept for Zotero 9 local install validation.

## Documentation

- [Usage Guide](docs/USAGE.md)
- [Product Spec](docs/SPEC.md)
- [Release Notes](docs/RELEASE_NOTES_v0.1.0-beta.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

## License

MIT
