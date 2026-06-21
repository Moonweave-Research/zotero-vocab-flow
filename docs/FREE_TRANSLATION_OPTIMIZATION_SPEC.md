# Free Translation Optimization Spec

## Status

Implemented for the `v0.1.4-beta.1` release slice.

`google-free` already deduplicates repeated terms inside one translation run. This spec defines the implemented safe optimization work added after `v0.1.3-beta.1`.

## Goal

Make the free translation path as useful as it can be without increasing external-service risk:

1. Reuse trustworthy local meanings before calling `google-free`.
2. Persist successful free translations for later runs.
3. Learn from user-edited/manual Korean meanings.
4. Avoid repeated failed requests.
5. Reject obviously bad provider output.

The goal is fewer external requests and fewer bad fills, not dictionary-grade translation.

## Non-Goals

- Do not add new dependencies.
- Do not enable translation by default.
- Do not send source context to `google-free`.
- Do not add concurrent `google-free` requests.
- Do not batch many terms into undocumented endpoint tricks.
- Do not promise professional translation quality.
- Do not overwrite manually entered Korean meanings.
- Do not read or scan unrelated Zotero notes outside the selected item in this slice.

## Current Baseline

Implemented in `v0.1.3-beta.1`:

- `google-free` is opt-in.
- It sends terms only, with no source context.
- It fills only blank Korean meaning cells.
- It deduplicates repeated exact terms in one run.
- It caches successful exact terms for the lifetime of one translator instance.
- It keeps partial successes when one request fails.

Known remaining gaps:

- A term translated in one Zotero item is requested again in another item.
- A term manually corrected by the user is not reused automatically later.
- Case/punctuation variants can miss cache hits.
- Empty/rate-limited terms can be retried immediately on the next run.
- Provider output is accepted if non-empty, even when it is obviously useless.

## Proposed Design

### 0. Implementation Boundary

Keep `src/translator.ts` responsible for provider calls and provider-local cache behavior. Put wordbook-note memory harvesting near `src/noteWriter.ts`, because that module already owns generated note parsing, sanitized-row fallback parsing, and blank-cell filling.

Required implementation shape:

- Add a small free-translation memory helper, for example `src/freeTranslationMemory.ts`, for preference cache parsing, normalization, quality gates, and failure-marker decisions.
- Add or reuse note parsing helpers in `src/noteWriter.ts` to collect filled Korean meanings from the current generated wordbook HTML before calling the external translator.
- Keep `fillMissingMeanings` provider-agnostic for paid/BYO providers. The menu/default call path should decide whether to wrap the translator with free-translation memory by checking `createTranslatorFromPrefs().provider`.
- The local-memory prefill path should activate only when the active provider is `google-free`, not for OpenAI-compatible, Gemini, or Anthropic.
- The translation callback should still return `Map<string, string>`, but for `google-free` that map may include local-memory hits as well as network results.

Concrete call boundary:

- Add a google-free-specific fill helper, for example `fillMissingMeaningsWithFreeMemory(parent, translator)`, or equivalent dependency injection in `menuManager.ts`.
- Keep the existing `fillMissingMeanings(parent, translate)` behavior unchanged for all other providers.
- The helper may reuse note parsing internals only through exported narrow helpers; do not duplicate large regex parsers in a second module.

### 1. Local Meaning Memory

Add a small local memory layer used before `google-free` network calls.

Lookup order:

1. Current generated wordbook note filled rows.
2. Persistent Vocab Flow translation cache.
3. External `google-free` request.

Manual meanings should outrank free-provider meanings. If a user later edits a Korean meaning, that manual value should become the preferred value for the normalized term key.

### 2. Persistent Cache

Store a bounded cache in Zotero preferences:

- Key: `extensions.vocabflow.translation.googleFree.cache.v1`
- Format: JSON object with version, translation entries, failure entries, and timestamps.
- Max translation entries: 500.
- Max failure entries: 500.
- Translation eviction: least-recently-used by `lastUsedAt`.
- Failure eviction: oldest `failedAt` first.
- Translation entry shape:

```json
{
  "version": 1,
  "entries": {
    "polymer": {
      "meaning": "고분자",
      "source": "google-free",
      "createdAt": 1781970000000,
      "lastUsedAt": 1781970000000
    }
  }
}
```

Failure entry shape:

```json
{
  "version": 1,
  "failures": {
    "actuator": {
      "reason": "network",
      "failedAt": 1781970000000
    }
  }
}
```

Allowed `source` values:

- `manual`
- `google-free`

Manual entries should not be replaced by `google-free` entries for the same normalized key.

Allowed failure `reason` values:

- `network`
- `empty`
- `rejected`
- `rate-limit`

Cache privacy rule: cache only term-to-meaning pairs and failure metadata. Never store source context in the free translation cache.

Staleness rule: `google-free` entries should be considered refreshable after 180 days. Manual entries do not expire automatically.

Clear-cache requirement: add a menu command to clear the free translation cache in the same implementation slice. Disabling translation should not silently delete cache data, because users may disable temporarily; clearing should be explicit.

### 3. Term Normalization

Use a conservative cache key:

1. Trim leading/trailing whitespace.
2. Collapse internal whitespace to one space.
3. Remove surrounding punctuation only.
4. Lowercase ASCII.

Non-ASCII letters are left unchanged. Do not stem, singularize, lemmatize, split phrases, or rewrite hyphenated terms in the cache layer. Those operations can map distinct technical terms onto the wrong Korean meaning.

Examples:

- `Polymer` -> `polymer`
- `polymer.` -> `polymer`
- `  finite   element  ` -> `finite element`
- `T-cell` -> `t-cell`

### 4. Manual Meaning Harvest

Before any external request, scan the current generated wordbook note for rows with non-empty Korean meanings.

For each filled row:

- Normalize the term key.
- Normalize the meaning by stripping Zotero wrapper HTML and trimming cell text.
- Store the Korean meaning as `source: "manual"` if it is not empty and passes the manual-meaning sanity gate.
- Use it immediately for other blank rows with the same normalized key.

This keeps user corrections local and avoids re-requesting terms the user already fixed.

Manual-meaning sanity gate:

- Meaning is non-empty after trimming.
- Meaning is not equal to the source term case-insensitively.
- Meaning does not contain HTML tags after Zotero cell text normalization.
- Meaning length is at most 120 characters.

### 5. Failure Backoff

Persist short-lived failure markers for `google-free` network failures or empty provider output:

- Key: normalized term.
- TTL: 24 hours.
- Do not cache malformed manual data as failures.
- Do not show failure markers as translations.

If a term has a fresh failure marker, skip the network call and leave the cell blank. This prevents repeated blocked/rate-limited terms from being retried on every run.

Rate-limit detection:

- HTTP 429 should write `reason: "rate-limit"`.
- Other non-2xx responses and thrown fetch errors should write `reason: "network"`.
- Empty valid responses should write `reason: "empty"`.
- Quality-gate failures should write `reason: "rejected"`.

### 6. Output Quality Gate

Accept a `google-free` result only if all checks pass:

- Result is non-empty after trimming.
- Result is not equal to the source term case-insensitively.
- Result does not contain HTML tags.
- Result does not contain URL-like text.
- Result length is at most 80 characters.
- Result is not only punctuation, digits, or whitespace.

Rejected output should count as no translation and should write a failure marker with the same 24-hour TTL.

Provider-output rule: only `google-free` output goes through this quality gate. Paid/BYO provider parsing remains strict JSON exact-key matching and is not changed by this optimization slice.

## Execution Flow

For `fillMissingMeanings` with `google-free`:

1. Extract blank terms from the generated wordbook note.
2. Harvest filled meanings from the same note into local memory.
3. Persist harvested manual meanings before network work.
4. Normalize blank terms.
5. Fill blanks that match harvested manual/current-note meanings.
6. Fill remaining blanks that match persistent cache entries.
7. Skip remaining blanks with fresh failure markers.
8. Request only the still-missing normalized terms from `google-free`, sequentially.
9. Apply output quality gates.
10. Persist successful `google-free` results.
11. Persist rejected/failed results as failure markers.
12. Save the note only if at least one meaning was filled.

If there are no blank terms, do not harvest or write cache data. A no-op translation command should not mutate preferences.

## Edge Cases

- Same word appears twice, one filled and one blank: fill the blank from the filled row without network.
- Same normalized word appears with different casing: reuse cached/manual value.
- Same normalized word has manual and `google-free` values: use manual.
- Cache JSON is malformed: ignore cache and start fresh after the run.
- Translation cache exceeds max entries: evict least recently used entries before saving.
- Failure cache exceeds max entries: evict oldest failure markers before saving.
- `google-free` cache entry is older than 180 days: allow refresh unless a manual entry exists.
- Provider returns the source term unchanged: reject.
- Provider returns very long text: reject.
- Provider fails for one term: keep other successes.
- Note has Zotero-sanitized rows without data attributes: reuse the existing plain-row parsing path where available.
- Source term is empty after normalization: skip cache and network.
- Two visible terms normalize to the same key but have different filled manual meanings in one note: prefer the first row in note order and do not overwrite it with later `google-free` output.
- User clears the free translation cache: remove both translation entries and failure markers.
- User disables translation: leave cache untouched, and do not read/write cache while provider is `off`.

## Acceptance Tests

Add focused unit tests before implementation:

- Reuses a filled meaning from the same wordbook note without calling fetch.
- Reuses a persistent cache entry without calling fetch.
- Stores a successful `google-free` translation in the persistent cache.
- Manual cache entries outrank `google-free` cache entries.
- Harvested manual meanings persist before network work.
- Normalized cache keys match case and surrounding punctuation variants.
- Malformed cache JSON does not break translation.
- Fresh failure markers prevent repeated network calls.
- Expired failure markers allow a new network attempt.
- HTTP 429 writes a `rate-limit` failure marker.
- Rejects unchanged source-term output.
- Rejects URL/HTML/too-long output.
- Evicts old cache entries beyond the max size.
- Evicts old failure markers beyond the max size.
- Leaves OpenAI-compatible, Gemini, and Anthropic provider behavior unchanged.
- Does not read or write cache when provider is `off`.
- Does not mutate cache when there are no blank meanings.
- Clear-cache menu command removes translation entries and failure markers.
- Cache serialization never includes source context text.

## Release Gate

The feature is complete when:

- Unit tests cover all acceptance cases above.
- `npm run release:check` passes.
- Docs state that free translation optimization reduces calls and bad fills, but does not make `google-free` reliable.
- Existing paid/BYO providers are behaviorally unchanged.
- Cache data never stores source context.
- A user-facing clear-cache path exists.

## Deferred Decisions

Decided for this slice:

- Persistent cache is user-clearable from a menu item in the same release.
- Cache size starts at 500 translation entries and 500 failure entries.
- Manual meanings are harvested only from the current selected/generated wordbook item.
- Stale `google-free` entries refresh after 180 days unless a manual entry exists.

Deferred:

- Whether to scan all Vocab Flow wordbook notes in the library for manual meanings.
- Whether to add cache import/export.
- Whether to expose cache size or entry count in UI.

Initial recommendation:

- Implement current-item harvest, persistent cache, failure backoff, quality gates, and clear-cache UI first.
- Defer global library scanning until real use proves the need.
