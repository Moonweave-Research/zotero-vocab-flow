# Release Notes - v0.1.3-beta.1

## Summary

v0.1.3-beta.1 expands the optional translation aid after candidate review. Translation remains disabled by default and still only fills blank Korean meaning cells.

## Changes

- Added direct Gemini BYO API translation configuration.
- Added direct Claude/Anthropic BYO API translation configuration.
- Kept OpenAI-compatible BYO API as the gateway path for OpenRouter, LiteLLM, local LLM proxies, and other Chat Completions-compatible endpoints.
- Reduced avoidable `google-free` traffic by deduplicating repeated terms during one translation run.
- Added provider expansion design notes, edge-case review, and tests for provider request shapes and menu wiring.

## Verification

- `npm run test:unit`
- `npm run typecheck`
- `npm run build`
- `npm run release:check`

## Artifact

Download `zotero-vocab-flow.xpi` from the GitHub prerelease asset for `v0.1.3-beta.1`.

SHA-256: `d8f7bd76c37500169e5e39ec054354e8b4a552ea28c26ebfc39a40d50ffec620  zotero-vocab-flow.xpi`

## Limits

- Gemini and Claude/Anthropic live calls require user-owned API keys and were verified locally with mocked provider responses, not paid API calls.
- Automatic translation is still a review aid, not a dictionary-grade guarantee.
