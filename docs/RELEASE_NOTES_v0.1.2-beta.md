# Release Notes - v0.1.2-beta.1

Date: 2026-06-21

## Summary

v0.1.2-beta.1 closes the remaining public-stable readiness gaps from the beta audit: representative paper-style candidate fixtures, translation UX decision, and release artifact/checksum process.

## Changes

- Added representative paper underline fixtures for materials, biomedical, and machine-learning prose.
- Added phrase extraction for `near-infrared irradiation`, `single-cell RNA sequencing`, `microglia activation`, and `attention maps`.
- Filtered additional prose-glue words from candidate extraction: `showed`, `under`, `after`, `evaluated`, and `across`.
- Documented the stable translation UX decision: translation remains a menu-only experimental aid, default off, with settings pane deferred until provider configuration grows.
- Added `docs/RELEASE_PROCESS.md` covering beta/stable artifact naming, SHA-256 publication, GitHub/update-manifest trust model, and CI/local release gate equivalence.
- Extended `npm run release:check` to verify that the release process document defines the artifact and checksum policy.
- Marked the public-stable checklist items complete.

## Verification

- `npm run test:unit`
- `npm run typecheck`
- `npm run build`
- `npm run release:check`

## Install

Download `zotero-vocab-flow.xpi` from the GitHub prerelease asset for `v0.1.2-beta.1`.

SHA-256: `8a50ddd214c9fcf129c22ac520524a711b820ed10394d9e1b0ede494297c8e60  zotero-vocab-flow.xpi`
