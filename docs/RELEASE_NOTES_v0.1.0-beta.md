# Vocab Flow v0.1.0-beta Release Notes

Date: 2026-06-03

## Summary

Vocab Flow v0.1.0-beta is a Zotero 9 plugin preview for researchers who want to turn intentional PDF underline annotations into a reviewed vocabulary note.

The core workflow is:

1. Mark vocabulary-worthy terms with a chosen underline color or the `vocab` annotation tag.
2. Build `term candidates`.
3. Review and exclude noisy candidates.
4. Save selected candidates into a final `단어장 (...)` note.
5. Optionally fill blank `Korean meanings` with the inaccurate free translation aid.

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

- Unit tests: `npm run test:unit` -> 96/96 passing.
- TypeScript: `npm run typecheck` -> passing.
- Build: `npm run build` -> passing.
- Installed Zotero runtime callback verification covered candidate generation, candidate acceptance, final note creation, cleanup, and DB read-only cleanup checks.
- Installed Zotero runtime label verification covered the current translation-aid and candidate menu labels.
- Latest default-profile XPI hash at release prep: `5515f32cb536bac99d9be67724d8904185ad2b0c97ecc239fec8b44deaca9eb3`.

## Known Risks

- Candidate quality is heuristic and may miss domain terms or keep weak terms.
- Positive annotation-level runtime coverage is strongest for green/all-underlines workflows; other color menus are registered and labeled but need broader real-annotation fixtures before a stable release.
- Translation is intentionally framed as a weak aid. Users should review meanings manually.
- BYO API keys are stored in Zotero preferences, and context sending can transmit stored underline text to the configured external API.
- The manifest currently keeps an inert `update_url` because Zotero 9 install behavior was validated with that shape during local testing.
