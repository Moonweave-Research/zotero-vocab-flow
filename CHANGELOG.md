# Changelog

## v0.1.1-beta.1 - 2026-06-20

- Replaced the inert Zotero `update_url` with a repository-hosted `updates.json` endpoint.
- Added update manifest metadata for the GitHub prerelease XPI.
- Extended release checks to validate the update URL, update manifest, compatibility bounds, and XPI SHA-256 hash.

## v0.1.0-beta.1 - 2026-06-15

- Added OpenAI-compatible BYO translation provider support.
- Preserved source context from candidate extraction through optional translation callbacks.
- Hardened generated-note handling for Zotero-sanitized note HTML.
- Improved candidate filtering for generic academic prose and OCR-confusable fragments.
- Added user-visible error reporting and notification fallback behavior.
- Verified release with `npm run release:check`, 110 passing unit tests, GitHub Actions CI, and Zotero runtime QA on the packaged XPI.

## v0.1.0-beta - 2026-06-04

- Initial prerelease for Zotero 9 local workflow validation.
- Added color/tag/all-underlines candidate extraction.
- Added candidate review notes, exclusion persistence, final wordbook note generation, and opt-in translation-aid framing.
