# Vocab Flow v0.1.0-beta Release Notes

Date: 2026-06-03

## Summary

Vocab Flow v0.1.0-beta is a Zotero 9 plugin preview for researchers who want to turn intentional PDF underline annotations into a reviewed vocabulary note.

The core workflow is:

1. Mark vocabulary-worthy terms with a chosen underline color or the `vocab` annotation tag.
2. Build `term candidates`.
3. Review and exclude noisy candidates.
4. Save selected candidates into a final `단어장 (...)` note.
5. Optionally fill blank `Korean meanings` with the experimental translation aid.

## What's Included

- Color-specific candidate extraction for green, yellow, blue, purple, red, and gray underline annotations.
- `vocab` annotation-tag extraction for users who need a semantic marker independent of color.
- Advanced all-underlines extraction for legacy/bulk review.
- Candidate review notes with source context and `Review before translation` guidance.
- Exclusion persistence through `제외`, `x`, and legacy exclusion tokens.
- Final vocabulary notes with `용어 (Term)` and `한국어 뜻 (Korean meaning)` columns.
- Optional experimental translation aid that fills only blank Korean meanings.
- Data-safety ownership markers so generated notes are handled separately from user notes.
- A real 48px plugin icon, with SVG source kept in `addon/icon.svg`.

## What This Release Does Not Promise

- It is not a stable public release.
- It does not treat every underline as final vocabulary by default.
- It does not edit PDF annotations or user notes outside generated Vocab Flow blocks.
- It does not guarantee dictionary-grade or context-perfect Korean translation.
- It does not guarantee availability, rate limits, or long-term stability of the `google-free` translation endpoint.
- It does not yet include a full settings pane or multiple translation providers.

## Verification Evidence

- Unit tests: `npm run test:unit` -> 80/80 passing.
- TypeScript: `npm run typecheck` -> passing.
- Build: `npm run build` -> passing.
- Installed Zotero runtime callback verification covered candidate generation, candidate acceptance, final note creation, cleanup, and DB read-only cleanup checks.
- Installed Zotero runtime label verification covered the current translation-aid and candidate menu labels.
- Latest default-profile XPI hash at release prep: `14b2fd416f5e2dd2abe0fcf0330bd51617682f6d52f34df9d3b6e5347e3a357d`.

## Known Risks

- Candidate quality is heuristic and may miss domain terms or keep weak terms.
- Positive annotation-level runtime coverage is strongest for green/all-underlines workflows; other color menus are registered and labeled but need broader real-annotation fixtures before a stable release.
- Translation is intentionally framed as an aid. Users should review meanings manually.
- The manifest currently keeps an inert `update_url` because Zotero 9 install behavior was validated with that shape during local testing.
