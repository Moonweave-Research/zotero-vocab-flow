# Vocab Flow v0.1.0-beta.1 Release Notes

Date: 2026-06-15

## Summary

Vocab Flow v0.1.0-beta.1 is a Zotero 9 plugin prerelease for researchers who want to turn intentional PDF underline annotations into a reviewed vocabulary note. It follows the original `v0.1.0-beta` prerelease without moving the existing tag.

The core workflow is:

1. Mark vocabulary-worthy terms with a chosen underline color or the `vocab` annotation tag.
2. Build `term candidates`.
3. Review and exclude noisy candidates.
4. Save selected candidates into a final `단어장 (...)` note.
5. Optionally fill blank `Korean meanings` with a configured translation aid after review.

## What's Included

- Color-specific candidate extraction for green, yellow, blue, purple, red, and gray underline annotations.
- `vocab` annotation-tag extraction for users who need a semantic marker independent of color.
- Advanced all-underlines extraction for legacy/bulk review.
- Candidate review notes with source context and `Review before translation` guidance.
- Exclusion persistence through `제외`, `x`, and legacy exclusion tokens.
- Final vocabulary notes with `용어 (Term)` and `한국어 뜻 (Korean meaning)` columns.
- Optional translation aids that fill only blank Korean meanings after opt-in: inaccurate free `google-free`, or OpenAI-compatible BYO API with a context-send toggle.
- Data-safety ownership markers so generated notes are handled separately from user notes.
- A real 48px plugin icon, with SVG source kept in `addon/icon.svg`.

## What This Release Does Not Promise

- It is not a stable public release.
- It does not treat every underline as final vocabulary by default.
- It does not edit PDF annotations or user notes outside generated Vocab Flow blocks.
- It does not guarantee dictionary-grade or context-perfect Korean translation.
- It does not guarantee research-term quality, availability, rate limits, or long-term stability of any external translation provider.
- It does not yet include a full settings pane; BYO API setup is still menu/prompt based.

## Verification Evidence

- Unit tests: `npm run test:unit` -> 110/110 passing.
- TypeScript: `npm run typecheck` -> passing.
- Build: `npm run build` -> passing.
- Release gate: `npm run release:check` -> passing.
- Installed Zotero runtime callback verification covered green candidate generation on item `9761`, candidate acceptance, final note creation, OpenAI-compatible BYO translation callback against a localhost mock endpoint, cleanup, and DB read-only cleanup checks.
- Installed Zotero runtime label verification covered the current translation-aid and candidate menu labels.
- Latest default-profile XPI hash at release prep: `ed59c077c289b985b8ebf1f46d33caec3cbeafcc0ea0b35c94f6756c8b5d0afe`.
- Final cleanup verification found no active generated Vocab Flow notes in the live Zotero DB: `active_candidates=0`, `active_words=0`, `active_any=0`.

## Known Risks

- Candidate quality is heuristic and may miss domain terms or keep weak terms.
- Positive annotation-level runtime coverage is strongest for green/all-underlines workflows; other color menus are registered and labeled but need broader real-annotation fixtures before a stable release.
- Translation is intentionally framed as a weak aid. Users should review meanings manually.
- Release QA used a localhost OpenAI-compatible mock endpoint, not a paid production API call.
- BYO API keys are stored in Zotero preferences, and context sending can transmit stored underline text to the configured external API.
- The manifest currently keeps an inert `update_url` because Zotero 9 install behavior was validated with that shape during local testing.
