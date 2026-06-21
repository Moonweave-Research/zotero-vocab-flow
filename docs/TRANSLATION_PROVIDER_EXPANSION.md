# Translation Provider Expansion

## Decision

Vocab Flow should support four opt-in translation paths:

- `google-free`: no-key, weak, unofficial Google Translate aid for terms only.
- `openai-compatible`: BYO Chat Completions endpoint for OpenAI, OpenRouter, LiteLLM, local proxies, and other compatible gateways.
- `gemini`: direct Google Gemini BYO API.
- `anthropic`: direct Claude/Anthropic BYO API.

No path replaces the review-first workflow. Candidate extraction and candidate acceptance remain the core product; translation only fills blank Korean meanings after the user explicitly asks.

## Provider Model

All LLM providers share the same internal contract:

1. Normalize requested terms.
2. Optionally include source context only when the provider-specific toggle is enabled.
3. Ask for a JSON object mapping each exact input term to a concise Korean meaning.
4. Parse only exact requested keys.
5. Ignore malformed, empty, or extra-key output.

`openai-compatible` remains the cheapest and broadest route when a gateway is acceptable. Gemini and Claude direct providers exist for users who want first-party APIs without running a proxy.

## Free Translation Optimization

The current `google-free` path is intentionally conservative because the endpoint is unofficial and can be blocked or rate-limited. The safe optimization is to avoid waste:

- Deduplicate repeated terms in a single translation run.
- Cache successful terms inside the translator instance.
- Keep sequential requests to avoid increasing rate-limit pressure.

Concurrency, retries, and persistent caches are deferred. They can improve speed, but they also increase provider pressure and make failure behavior harder to explain.

## Self Review

Strengths:

- Provider-specific request shapes are isolated behind one translator interface.
- The parser is strict enough to prevent providers from filling unrequested rows.
- The context toggle remains explicit per paid provider.
- OpenAI-compatible gateways still cover Gemini, Claude, cheap hosted models, and local models through OpenRouter or LiteLLM-style endpoints.

Risks:

- Native provider APIs may change; tests only prove the request shapes this code emits.
- Live quality cannot be proven without user keys and paid calls.
- Prompted JSON can still be semantically wrong even when it parses.
- Zotero preferences are convenient but not a hardened secret vault.

Mitigations:

- Keep docs clear that all automatic translation is review-only.
- Mock API shapes in unit tests and require manual smoke testing before release.
- Never enable any external provider by default.
- Keep keys out of logs and repository files.

## Edge Cases

- Duplicate terms should produce one `google-free` request.
- Unknown provider preference values must fall back to `off`.
- Missing API key, model, or endpoint must return no translations and avoid network calls.
- Provider responses wrapped in JSON fences should parse.
- Provider responses with extra keys should ignore the extras.
- Provider responses missing requested keys should fill only returned exact matches.
- Prompt cancellation should not change saved prefs.
- Context text with quotes, commas, and newlines should stay inside JSON-encoded payload text.

## Release Gate

This feature is releasable when:

- Unit tests cover core provider behavior and menu configuration.
- Typecheck and build pass locally.
- Docs explain which option to choose:
  - Direct Gemini or Anthropic for first-party BYO keys.
  - OpenAI-compatible for gateways and cheap model routing.
  - `google-free` only for low-confidence no-key help.
- A manual Zotero smoke test verifies at least one configured provider can fill a blank Korean meaning in a generated wordbook.
