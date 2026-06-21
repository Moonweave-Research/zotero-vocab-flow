# Release Notes - v0.1.4-beta.1

## Summary

v0.1.4-beta.1 optimizes the optional `google-free` translation aid. Translation remains disabled by default and still only fills blank Korean meaning cells.

## Changes

- Reuses filled meanings from the current generated wordbook before making `google-free` requests.
- Stores successful `google-free` translations in a bounded Zotero preference cache.
- Prefers user/manual meanings over free-provider cache entries.
- Skips repeated failed/rate-limited/rejected free translation requests for 24 hours.
- Rejects obviously bad free-provider output, including unchanged source terms, HTML, URLs, and overly long text.
- Adds a user-facing `무료 번역 캐시 비우기` menu command.

## Verification

- `npm run test:unit`
- `npm run typecheck`
- `npm run build`
- `npm run release:check`

## Artifact

Download `zotero-vocab-flow.xpi` from the GitHub prerelease asset for `v0.1.4-beta.1`.

SHA-256: `d7f4d55dbbbd8702aa903503f53475f5834b7a8a63f7f9b1aeec1254448c4bf0  zotero-vocab-flow.xpi`

## Limits

- `google-free` is still an inaccurate review aid. It reduces repeated calls and obvious bad fills, but it does not make free translation reliable.
- The free translation cache stores term-to-meaning pairs and failure metadata only. It does not store source context text.
