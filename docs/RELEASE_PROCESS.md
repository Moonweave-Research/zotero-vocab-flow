# Release Process

## Current Decision

GitHub prerelease assets are enough for beta distribution. Public stable releases should keep the same GitHub Releases flow unless Vocab Flow moves to a dedicated hosting path or an official Zotero plugin directory becomes available.

Zotero's developer documentation uses `manifest.json` with `applications.zotero.update_url` and a JSON update manifest containing `update_link` and `update_hash`. Zotero's plugin documentation also states that users install plugins by downloading an `.xpi` and that plugins have full local access, so the trust model must be explicit.

References:

- https://www.zotero.org/support/dev/zotero_7_for_developers
- https://www.zotero.org/support/plugins

## Artifact Policy

Published release assets:

- `zotero-vocab-flow.xpi`
- release notes for the tag
- a visible SHA-256 checksum line in the release body

Keep the XPI filename stable as `zotero-vocab-flow.xpi` because `updates.json` and `scripts/release-check.js` verify this name for Zotero auto-update compatibility.

Release tags:

- Beta: `vX.Y.Z-beta.N`
- Stable: `vX.Y.Z`

## Checksum Policy

Every published XPI must have a SHA-256 checksum in two places:

- `updates.json` as `update_hash: sha256:<hex>`
- GitHub release body as `SHA-256: <hex>  zotero-vocab-flow.xpi`

Generate the checksum after building:

```bash
shasum -a 256 zotero-vocab-flow.xpi
```

`npm run release:check` must pass before publishing. It verifies the package/manifest version, XPI manifest, icon, `updates.json`, and that `updates.json` points to the expected GitHub release asset with a matching SHA-256 hash.

## Trust Model

Vocab Flow is not separately signed beyond the GitHub release identity, HTTPS download, and the Zotero update manifest hash. Users should install only from the official `Moonweave-Research/zotero-vocab-flow` GitHub release page or through Zotero's update flow using the repository-hosted `updates.json`.

If public distribution expands beyond GitHub beta users, revisit whether the project needs a dedicated download host, a stronger signing story, or official-directory submission.

## CI/Local Equivalence

The local and CI release gate is the same command:

```bash
npm run release:check
```

CI must build the XPI before running the check. A CI-uploaded artifact is publishable only if it comes from the release tag commit and has the same SHA-256 hash recorded in `updates.json` and the release body.
