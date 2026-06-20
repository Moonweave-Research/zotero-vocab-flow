# Vocab Flow v0.1.1-beta.1 Release Notes

Date: 2026-06-20

## Summary

Vocab Flow v0.1.1-beta.1 is a packaging and update-distribution prerelease. It keeps the v0.1.0-beta.1 workflow behavior and replaces the inert update URL with a real Zotero update manifest path.

## What's Changed

- Added `updates.json` for Zotero's JSON update manifest flow.
- Pointed `addon/manifest.json` at the repository-hosted update manifest.
- Added release-check coverage for update URL, update manifest version, update link, compatibility bounds, and XPI SHA-256 hash.

## Verification Evidence

- Unit tests: `npm run test:unit` -> passing.
- TypeScript: `npm run typecheck` -> passing.
- Build: `npm run build` -> passing.
- Release gate: `npm run release:check` -> passing.

## Known Risks

- Existing v0.1.0-beta.1 installs still contain the old inert update URL. Users need to install v0.1.1-beta.1 once before future Zotero update checks can use the real update manifest.
- GitHub prerelease assets remain the distribution channel; formal signing/distribution is still tracked separately.
