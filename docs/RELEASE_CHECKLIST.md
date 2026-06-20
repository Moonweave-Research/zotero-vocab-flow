# Release Checklist

## v0.1.2-beta

- [x] Version set to `0.1.2` in `package.json`, `package-lock.json`, and `addon/manifest.json`.
- [x] Representative paper underline fixtures added for candidate quality.
- [x] Translation UX decision documented as menu-only experimental aid for this release line.
- [x] Release process documents XPI naming, SHA-256 publication, GitHub/update-manifest trust model, and CI/local gate equivalence.
- [x] `npm run release:check` validates test, typecheck, build, version sync, XPI manifest, icon size, update manifest, update hash, and release process documentation.

## v0.1.1-beta

- [x] Version set to `0.1.1` in `package.json`, `package-lock.json`, and `addon/manifest.json`.
- [x] Candidate review workflow documented in `docs/SPEC.md` and `docs/USAGE.md`.
- [x] Translation framed as an experimental aid, not the core product promise.
- [x] Zotero `update_url` points to a real repository-hosted JSON update manifest.
- [x] `updates.json` points at the v0.1.1-beta.1 GitHub prerelease XPI.
- [x] Unit tests pass.
- [x] TypeScript typecheck passes.
- [x] XPI builds successfully.
- [x] Plugin icon is a real 48px PNG with SVG source.
- [x] Local XPI copied to the default Zotero profile.
- [x] Local/profile XPI hashes match.
- [x] Installed Zotero runtime menu labels verified.
- [x] Read-only DB cleanup check reports no active generated test notes.
- [x] `npm run release:check` validates test, typecheck, build, version sync, XPI manifest, icon size, update manifest, and update hash.
- [x] GitHub Actions CI runs the release check on push and pull request.

## Before Public Stable

- [x] Add positive runtime fixtures for all supported annotation colors.
- [x] Decide whether translation providers remain menu-only or move to a settings pane.
- [x] Improve candidate quality with representative paper underline fixtures.
- [x] Add release signing/distribution beyond GitHub prerelease assets if publishing beyond local beta users.
