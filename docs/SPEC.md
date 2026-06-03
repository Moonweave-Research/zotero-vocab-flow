# Vocab Flow Product Spec

## Goal

Vocab Flow helps a Zotero user turn intentional PDF underline annotations into a reviewable English vocabulary list without mixing ordinary reading underlines into the final note by default.

## Non-Goals

- It does not position automatic translation as the main workflow. Translation is an optional aid because it can send vocabulary terms to an external service.
- It does not maintain multiple parallel candidate drafts for one Zotero item.
- It does not edit PDF annotations, annotation colors, or user notes outside generated Vocab Flow blocks.

## Source Selection

The plugin offers four source classes from a selected regular Zotero item with at least one PDF attachment:

- Color modes: green, yellow, blue, purple, red, gray underline annotations.
- Tag mode: underline annotations with annotation tag `vocab`.
- Advanced all-underlines mode: every underline annotation in the item PDFs.
- Empty or non-PDF items must not create generated notes.

Color modes are the recommended workflow. Tag mode is for users who need a semantic marker independent of color conventions. All-underlines mode is explicitly advanced because it can include ordinary reading underlines.

## Candidate Draft

Candidate generation creates or updates one active candidate note per item. The note must:

- Contain `data-vocab-flow-candidates="review"`.
- Store `data-vocab-flow-scope` as `color`, `tag`, or `all`.
- State the active source scope in visible text.
- Explain that the candidate note is a `Review before translation` stage and that translation aid does not replace candidate review.
- Render a compact Korean-first review table with light English labels: `용어 후보 (Term candidate)`, `저장 여부 (Keep?)`, and `밑줄 문맥 (Context)`.
- Keep implementation metadata such as candidate type in row data attributes rather than as a visible editing column.
- Truncate long source snippets so repeated full-sentence underlines do not dominate the candidate list.
- Preserve excluded decisions across regeneration.

Decision values treated as excluded:

- `excluded`
- `exclude`
- `제외`
- `x`
- `no`, `n`, `0`, `false`

Decision values treated as included:

- `candidate`
- `include`, `included`
- `keep`
- `저장`, `포함`, `유지`
- `yes`, `y`, `1`, `true`

## Accept Flow

Accepting candidates reads the active generated candidate note for the item, writes accepted labels into one generated final vocab note, and trashes the candidate note after successful final-note save.

If the selected item set contains 30 or more accepted candidates, accepting must show a confirmation dialog before writing the final note. Canceling the dialog must leave candidate and final notes unchanged except for no-op reads.

The final note must:

- Contain `data-vocab-flow="words"`.
- Be tagged `_vocab-extract`.
- Render as `단어장 (...)` with visible columns `용어 (Term)` and `한국어 뜻 (Korean meaning)`.
- Preserve existing Korean meanings by word key when regenerated.
- Leave the Korean meaning cells empty when no translation exists.

## Translation Flow

Korean meaning fill is an optional aid and is disabled by default.

Supported provider values:

- `off`: default. No network request is made.
- `google-free`: experimental no-key Google Translate endpoint. This is free to try but not guaranteed for availability, rate limits, or long-term stability.

The translation command must:

- Fill only blank `한국어 뜻` cells in generated Vocab Flow final notes.
- Work from either the parent regular item selection or the generated final vocab note selection.
- Preserve every manually entered Korean meaning.
- Never replace the candidate-review stage or run from candidate notes.
- Leave blanks unchanged when the provider is disabled, unavailable, rate-limited, or returns no translation.
- Report provider no-results separately from items that truly have no blank meaning cells.
- Never run automatically during candidate generation or accept flow.
- Show an external-service confirmation before sending terms to `google-free`.
- Show an additional confirmation when the selected item set has 30 or more blank meanings to translate.
- Keep partial successes when some individual translation requests fail.

## Data Safety

Generated notes are identified by Vocab Flow ownership markers first and Zotero tags second. The plugin may update or trash notes containing these ownership markers. It must ignore user notes that only happen to use `_vocab-extract` or `_vocab-candidates` tags without the ownership marker.

Runtime validation on a real profile must finish with:

- `active_candidate=0`
- `active_final=0`
- `active_marker=0`

for generated test artifacts after cleanup.

## UX Requirements

- Empty color results must name the selected color, for example `보라 후보 색상 밑줄이 없습니다`.
- Empty tag results must name the tag, for example `vocab 태그 밑줄이 없습니다`.
- Empty all-underlines results must identify the advanced path.
- Candidate notes must visibly explain whether they came from a color, tag, or all-underlines source.
- Usage documentation must warn that all-underlines can include reading underlines.

## Known Residual Risks

- The six color hex values must match Zotero's stored annotation colors. Green has been positively runtime-verified on item `9761`; other colors need positive annotation-level runtime fixtures before release confidence is complete.
- Candidate quality is heuristic. Domain-specific phrase extraction is not a dictionary or language model.
- The 30-candidate confirmation threshold is heuristic and may need adjustment after real use.
- The `google-free` translation provider is experimental and may be rate-limited or blocked. It should remain opt-in and framed as a translation aid, not as Vocab Flow's core value.
- Translation provider control is menu-based rather than a full settings pane. This is intentional for the current single-provider scope, but a settings pane may be needed if more providers are added.
