# Release Checklist

## v0.1.0-beta

- [x] Version set to `0.1.0` in `package.json`, `package-lock.json`, and `addon/manifest.json`.
- [x] Candidate review workflow documented in `docs/SPEC.md` and `docs/USAGE.md`.
- [x] Translation framed as an experimental aid, not the core product promise.
- [x] Unit tests pass.
- [x] TypeScript typecheck passes.
- [x] XPI builds successfully.
- [x] Plugin icon is a real 48px PNG with SVG source.
- [x] Local XPI copied to the default Zotero profile.
- [x] Local/profile XPI hashes match.
- [x] Installed Zotero runtime menu labels verified.
- [x] Read-only DB cleanup check reports no active generated test notes.
- [x] `npm run release:check` validates test, typecheck, build, version sync, XPI manifest, and icon size.
- [x] GitHub Actions CI runs the release check on push and pull request.

## Before Public Stable

- [ ] Add positive runtime fixtures for all supported annotation colors.
- [ ] Replace the inert `update_url` with a real update endpoint or remove it after install behavior is revalidated.
- [ ] Decide whether translation providers remain menu-only or move to a settings pane.
- [ ] Add release signing/distribution beyond GitHub prerelease assets if publishing beyond local beta users.
