# Vocab Flow Gap Audit

Date: 2026-06-02

Scope: runtime behavior for Zotero item `9761 / N3DP86MY` and the current Phase 0 implementation.

## Target Outcome

Vocab Flow must not treat every underlined sentence as a final vocabulary list. It should produce reviewable vocabulary candidates, keep source context clear, preserve user decisions, and only leave verified output in Zotero after the user intentionally accepts it.

## Issues

| ID | Status | Issue | User impact | Required fix | Verification |
| --- | --- | --- | --- | --- | --- |
| VF-001 | Closed | All underline annotations are treated as vocabulary input. | Normal reading underlines become noisy vocab entries. | Reframe command as candidate generation and prevent immediate final vocab overwrite from raw underlines. | Runtime callback creates a `_vocab-candidates` note and leaves active `_vocab-extract` at 0 during generation. |
| VF-002 | Closed | Candidate filter is too weak. | Words such as `These`, `their`, `between`, `he`, OCR fragments, and formula fragments remain. | Add stronger stopword, malformed-token, formula-fragment, and weak-general-word filtering. | Unit and runtime checks reject `These`, `their`, `between`, `he`, `stiffn`, `ncreasing`, `flippin`, `Ntwi`, `Ntw`, `Yeff`, `numbers`, `different`, `standard`, `deviation`. |
| VF-003 | Closed | No phrase extraction. | Terms such as `Young's modulus`, `Ashby plot`, `standard deviation`, and `liquid crystal elastomer` are split into less useful single words. | Extract candidate phrases from underline text in addition to high-signal single tokens. | Unit and runtime checks include multi-word technical phrase candidates. |
| VF-004 | Closed | No review step. | Bad candidates are written into the note immediately. | Write a `_vocab-candidates` review note with include/exclude state instead of directly updating final vocab. | Runtime note title is `Vocab candidates (40)`; final vocab note count remains 0 until accept. |
| VF-005 | Closed | No source context in output. | User cannot tell why a candidate was included. | Store source snippet and annotation order in the candidate table. | Candidate note rows include candidate, type, decision, and source text. |
| VF-006 | Closed | User deletions/exclusions are not remembered. | Previously rejected words can reappear on rerun. | Preserve existing excluded candidate rows and do not re-add them as active candidates. | Unit test: excluded row remains excluded after regeneration. |
| VF-007 | Closed | Korean meaning column implies translation but remains blank. | User may expect automatic translation. | Label final note and docs clearly as manual meaning entry unless translation is implemented. | Runtime final note has an empty `한국어 뜻` column; candidate note says meanings are entered manually in the final word list. |
| VF-008 | Closed | Menu label is ambiguous. | User cannot predict that the command scans all underlines. | Rename command to candidate generation language. | Zotero context menu shows `밑줄에서 단어 후보 만들기...` and `후보를 단어장으로 저장`. |
| VF-009 | Closed | Multi-item execution lacks clear result detail. | Batch use can hide which items produced candidates or errors. | Summary toast should distinguish candidate notes, empty results, and skipped PDFs. | Unit tests cover mixed result summary. |
| VF-010 | Closed | Test cleanup can leave active generated notes. | Real Zotero data can retain validation artifacts. | Runtime validation must confirm active notes are cleaned; raw trashed notes are acceptable but reported. | DB read-only query shows active candidate/final/tag counts at 0 after cleanup and reports 8 trashed generated notes. |
| VF-011 | Closed | General reading underlines and vocab underlines are not separated. | Users cannot predict which underlines become vocabulary candidates. | Make green underlines the default vocab source and move all-underlines scanning to an explicit advanced menu. | Runtime confirms default green scope creates 0 notes on item `9761`; advanced all-underlines creates `Vocab candidates (40)`. |
| VF-012 | Closed | Accepted candidate note remains active after final save. | User sees both a draft candidate note and final vocab note after saving, which looks like duplicate output. | Trash the generated candidate note after a successful accept flow. | Runtime accept flow leaves `active_candidate_notes_after_accept=0` and `active_final_notes_after_accept=1`. |
| VF-013 | Closed | Candidate notes do not record whether they came from green-only or all-underlines mode. | A user reopening the note later cannot tell whether noisy candidates came from the safe default path or the advanced bulk path. | Store `data-vocab-flow-scope` and a short scope sentence in the generated candidate note. | Unit tests cover both `vocab` and `all` scope rendering; runtime follow-up verifies the installed XPI renders all-underlines scope metadata. |
| VF-014 | Closed | Zotero runtime can retain generated HTML markers while tag-based lookup misses the note. | Candidate discard, excluded preservation, and final meaning preservation can fail, leaving duplicate active generated notes. | Treat the ownership marker as authoritative and backfill the generated tag when found. | Runtime found active `Vocab candidates (40)` and `Vocab (40)` after accept/regenerate; regression tests now cover marker-only candidate/final notes and marker-only discard. |
| VF-015 | Closed | Green underline as the only default vocab marker can conflict with an existing user color convention. | Users who already use green for reading or importance cannot predict which underlines are vocab candidates. | Provide explicit color-specific extraction menus and a separate `vocab` annotation-tag extraction path. | Unit tests cover custom color filtering, `vocab` tag filtering, menu option propagation, scope notes, and empty summaries. |
| VF-016 | Closed | Color-scope feedback was still generic in notes and empty-result toasts. | Users could run purple/yellow/etc. and see a generic "candidate color" message, making it harder to know which source was scanned. | Render Korean color names in scope text and empty summaries. | Unit tests cover purple candidate-note scope and purple empty summary. |
| VF-017 | Closed | Excluding candidates required English state words. | Korean-first users had to remember `excluded` for every rejected row. | Treat `제외` and `x` as exclusion tokens and document them in the candidate note and usage guide. | Unit tests cover Korean and short exclusion tokens in edited Decision cells. |
| VF-018 | Closed | The all-underlines menu looked like a normal path even though it can mix reading underlines. | A user could choose bulk extraction without realizing it is intentionally noisy. | Rename the menu and docs to `고급: 모든 밑줄에서 후보 만들기...`; make empty summaries call it advanced. | Unit tests cover the advanced empty summary; docs and locale strings use the advanced label. |
| VF-019 | Closed | Product behavior was spread across code, docs, and runtime notes without one source-of-truth spec. | Reviewers could miss non-goals such as no automatic translation or one active candidate note per item. | Add a product spec covering goals, non-goals, source selection, candidate draft, accept flow, data safety, UX requirements, and residual risks. | `docs/SPEC.md` exists and is aligned with current unit/runtime expectations. |
| VF-020 | Closed | Large all-underlines candidate sets could be accepted without a final confirmation. | A user could turn 30+ noisy candidates into a final note by one accidental click. | Require confirmation before accepting 30 or more candidates; cancel must not write a final note or trash the candidate note. | Unit tests cover large-set cancel and small-set no-confirm paths; Zotero runtime verifies cancel and confirm behavior on a 40-candidate note. |
| VF-021 | Closed | Automatic Korean meanings were missing, while users expected translation from a vocab workflow. | Users had to fill every meaning manually and could confuse a blank column with a bug. | Add an opt-in translation command that fills only blank meanings; keep translation off by default to avoid surprise external requests or cost. | Unit tests cover disabled provider, experimental no-key provider, blank-only filling, and menu summary behavior. |
| VF-022 | Closed | Translation execution lacked an explicit external-service confirmation. | A user who enabled a provider once could later send terms externally by a single accidental menu click. | Confirm before any non-off translation provider is used. | Unit tests cover canceling the external translation confirmation before any fill call. |
| VF-023 | Closed | Large translation runs had no second guard. | Dozens of terms could be sent to an external endpoint without the same caution used for large accept. | Count blank meanings and confirm when the selected item set has 30 or more blanks. | Unit tests cover canceling a 40-term translation run before any fill call. |
| VF-024 | Closed | One failed translation request discarded the whole translation run. | A transient provider/rate-limit failure on one word could prevent already successful words from being saved. | Keep partial translation successes and leave only failed terms blank. | Unit test covers one failing request while another term is returned. |
| VF-025 | Closed | Final-note parsing assumed exact `<td>` markup. | Zotero editor HTML normalization could add cell attributes and break meaning preservation or auto-fill. | Accept `<td ...>` cells when reading, preserving, and filling meanings. | Unit test covers preserving and filling meanings in rows with table-cell attributes. |
| VF-026 | Closed | Non-green color menu labels rendered blank in Zotero runtime. | Users could not tell which color-specific command they were clicking. | Give every color menu a stable Fluent localization ID and locale label. | Computer-use runtime verification shows green, yellow, blue, purple, red, and gray labels in the installed XPI. |
| VF-027 | Closed | Translation provider setup still required a raw Zotero preference. | Non-technical users could not discover or safely toggle automatic translation. | Add menu-driven enable/disable commands with explicit external-service confirmation. | Unit tests cover enabling, canceling enable, disabling, menu registration, and off-state guidance. |
| VF-028 | Closed | Provider no-result runs looked like no blank meanings. | Users could think there was nothing to fill when the provider actually returned no translations. | Return and summarize an `untranslated` result when blank cells exist but no meanings are filled. | Unit tests cover note-level no-result reporting and menu toast wording. |
| VF-029 | Closed | Candidate review table exposed internal terms and repeated long source text. | Users saw `Candidate`, `Type`, `Decision`, `candidate`, and full repeated underline text, making the note look like debug output rather than an editable review list. | Render a compact Korean-first table with `후보`, `결정`, `밑줄 문맥`; show `포함`/`제외`; keep type as row metadata; truncate long source snippets; keep old 4-cell notes readable. | Unit tests cover compact rendering, source truncation, Korean decision parsing, and backward compatibility with old `candidate/type/decision/source` rows. |
| VF-030 | Closed | Korean labels still sounded like workflow state instead of a research note. | `후보`, `결정`, `포함`, `Vocab`, and `English` made generated notes feel like plugin internals rather than a researcher-facing vocabulary artifact. | Rename visible labels to `용어 후보`, `저장 여부`, `저장`, `단어장`, and `용어`; keep old tokens readable for compatibility. | Unit tests cover new candidate-note labels, `저장` token parsing, and final-note `단어장/용어` rendering. |
| VF-031 | Closed | Translation command silently did nothing when a generated vocab note was selected. | A user viewing the `단어장 (...)` note could run `빈 한국어 뜻 자동 채우기...` and see no change because only parent regular items were accepted as command targets. | Resolve generated Vocab Flow candidate/final notes to their parent item before running menu commands. | Unit test and installed Zotero runtime callback cover translating from a selected generated final vocab note. |
| VF-032 | Closed | The candidate-review stage did not clearly explain why translation waits until after accept. | Users could expect candidate notes to already contain Korean meanings and think the workflow is incomplete. | Add visible `Review before translation` copy explaining that candidates are filtered before final vocab/translation. | Unit tests cover the candidate-note explanation and bilingual review-table headers. |
| VF-033 | Closed | The UI was Korean-only enough to feel less professional/global than the research workflow. | Korean users still benefit from light English terminology such as `Term`, `Context`, and `Korean meaning`. | Keep Korean-first wording but add restrained English labels to note tables and key menu commands. | Unit tests cover generated note headers; locale/fallback labels use bilingual command text. |
| VF-034 | Closed | Automatic translation could still look like a central product promise. | Users may expect complete, reliable dictionary behavior from an experimental external endpoint. | Reframe translation as an optional experimental aid and state that it does not replace candidate review. | Unit tests cover translation-aid menu/toast labels and candidate-note guidance; docs/spec use aid framing. |

## Current Evidence

- Initial runtime on item `9761` produced `Vocab (64)` from all underline text, proving the direct-final flow was too noisy.
- After candidate-flow implementation, runtime produced one active `_vocab-candidates` note: item `9905 / 5J757T9N`, `Vocab candidates (40)`.
- Candidate generation idempotency: rerun kept `active_candidate_notes=1`, `active_final_notes=0`, `candidate_tags=1`.
- Runtime candidate labels excluded the observed noise set: `These`, `their`, `between`, `he`, `stiffn`, `ncreasing`, `flippin`, `Ntwi`, `Ntw`, `Yeff`, `numbers`, `different`, standalone `standard`, standalone `deviation`.
- Runtime candidate labels retained useful phrases/terms including `LCE matrix`, `CNTs`, `Young’s modulus`, `Ashby plot`, `modulus-to-density`, `strength-to-density`, and `standard deviation`.
- Accept flow produced one active final note: item `9906 / 3GIPPFDD`, `Vocab (40)`, with an editable empty `한국어 뜻` column.
- Earlier candidate-flow cleanup moved runtime notes `9905` and `9906` to Zotero Trash. That pass ended with `active_candidate_notes=0`, `active_final_notes=0`, `active_vocab_tags=0`, `trashed_vocab_notes=4`.
- Computer-use limitation: context-menu labels were verified in the Zotero GUI, but direct computer-use clicks on transient macOS menu items did not dispatch Zotero's `command` event. Runtime execution therefore used Zotero's official `Tools > Developer > Run JavaScript` window to invoke the exact registered `Zotero.MenuManager` callbacks from the installed XPI.
- Usability update after the first runtime pass: the default command is now `초록 밑줄에서 단어 후보 만들기...`; `모든 밑줄에서 후보 만들기...` is kept as an explicit advanced path for legacy/bulk scans.
- Final runtime pass after green-scope and accept-cleanup implementation:
  - GUI context menu shows `초록 밑줄에서 단어 후보 만들기...`, `모든 밑줄에서 후보 만들기...`, and `후보를 단어장으로 저장`.
  - Default green scope on item `9761` returned successfully and produced `after_default_candidate_notes=0`, `after_default_final_notes=0`, `after_default_vocab_tags=0`.
  - Advanced all-underlines scope produced active candidate note `9909`, `Vocab candidates (40)`, with 40 candidate rows.
  - Accept flow trashed candidate note `9909`, produced final note `9910`, `Vocab (40)`, and left `active_candidate_notes_after_accept=0`, `active_final_notes_after_accept=1`.
  - Cleanup moved final note `9910` to Zotero Trash. Final DB state: `active_candidate_notes_final=0`, `active_final_notes_final=0`, `active_vocab_tags_final=0`, `new_runtime_notes_trashed=9909,9910`.
  - Total generated test notes in Zotero Trash for item `9761`: `9902,9903,9905,9906,9907,9908,9909,9910`.
- Usage documentation now lives in `docs/USAGE.md` and states that color-specific underlines are the recommended source, all-underlines mode is advanced, and automatic Korean translation is opt-in with the experimental `google-free` provider.
- Additional runtime regression on item `9761` exposed marker-vs-tag drift: generated notes `9911` and `9913` stayed active after accept/regenerate even though their HTML ownership markers remained. They were manually trashed in Zotero and the code now finds generated notes by marker first, then restores missing tags.
- Final runtime regression after the marker-first fix:
  - Menu cache contains `Vocab Flow`, `초록 밑줄에서 단어 후보 만들기...`, `모든 밑줄에서 후보 만들기...`, and `후보를 단어장으로 저장`.
  - Default green scope created no generated notes: `afterDefault.owned=0`.
  - Advanced all-underlines created candidate note `9916` with `data-vocab-flow-scope="all"`, scope text, and 40 candidate rows.
  - Editing one candidate decision to `excluded` and regenerating preserved the exclusion: `excludedPreserved=true`, active candidates dropped from 40 to 39.
  - Accepting candidates removed the candidate note and kept one final note `9917` with 39 rows.
  - Entering `테스트뜻` in the final note and regenerating preserved the meaning: `meaningPreserved=true`, final note ID stayed `9917`.
  - Cleanup trashed `9917`; read-only DB verification ended with `active_candidate_final=0`, `active_final_final=0`, and `active_marker_final=0`.
- Candidate-source UX update after user review:
  - Vocab Flow now supports color-specific extraction for green, yellow, blue, purple, red, and gray underlines.
  - It also supports `vocab` annotation-tag extraction for users who need an explicit semantic marker.
  - `docs/USAGE.md` now recommends color-specific workflows first and documents `vocab` tag mode as the precise but slower path.
- Runtime validation after color/tag support on item `9761`:
  - Menu cache contains color-specific entries for green, yellow, blue, purple, red, and gray, plus `vocab` tag mode, all-underlines mode, and accept.
  - Green color mode created candidate note `9924`, `Vocab candidates (1)`, with `data-vocab-flow-scope="color"` and scope text `후보 색상(#5fb236)`.
  - Purple color mode and `vocab` tag mode produced no active generated notes on this item, confirming their empty-path behavior without data pollution.
  - Advanced all-underlines mode created candidate note `9925`, `Vocab candidates (40)`, with `data-vocab-flow-scope="all"` and 40 candidate rows.
  - Accept flow produced final note `9926`, `Vocab (40)`, then cleanup trashed the generated final note.
  - Cleanup trashed pre-existing generated note `9923`, green candidate note `9924`, and final note `9926`; read-only DB verification ended with `active_candidate=0`, `active_final=0`, and `active_marker=0`.
- Spec and UX hardening after final design review:
  - `docs/SPEC.md` defines source-selection rules, candidate-note invariants, accept-flow invariants, data-safety boundaries, and known residual risks.
  - Candidate notes and toasts now name the selected color, for example `보라 후보 색상`.
  - Candidate Decision cells now accept `제외`, `excluded`, and `x` for exclusion.
  - The all-underlines path is now labeled `고급: 모든 밑줄에서 후보 만들기...` in documentation and locale strings.
  - Usage docs explicitly state that only one active candidate note is kept per item and that a different source rerun replaces the previous candidate draft.
- Final spec-gap runtime validation on item `9761` after the spec/UX hardening:
  - Runtime-validated XPI hash in the default profile: `d1b09fe301a84fc605cde4011ef571ec370f408b81572bdf16727a943d2de570`.
  - Final rebuilt XPI was recopied to the default profile after documentation-only updates; final local/profile hash: `c9c818ae567f4ed8a3444b6b3f4083e39b182e5482f6a18f0867d950c875ff52`.
  - Menu cache contains all expected entries: six color-specific candidate commands, `vocab` tag command, `고급: 모든 밑줄에서 후보 만들기...`, and `후보를 단어장으로 저장`.
  - Initial cleanup trashed leftover generated candidate note `9927`.
  - Green mode created candidate note `9928`, `Vocab candidates (1)`, with `data-vocab-flow-scope="color"`, `초록 후보 색상(#5fb236)`, and the `제외, excluded, x` decision guide.
  - Editing the generated candidate Decision cell to `제외` and rerunning green mode produced `Vocab candidates (0)` with one excluded row, confirming Korean-first exclusion works in Zotero runtime.
  - Purple mode and `vocab` tag mode produced no active generated notes on this item.
  - Advanced all-underlines mode created candidate note `9929`, `Vocab candidates (40)`, with the advanced all-underlines scope warning and decision guide.
  - Accept flow created final note `9930`, `Vocab (40)`, and removed the active candidate note.
  - Cleanup trashed final note `9930`; read-only DB verification ended with `active_candidate=0`, `active_final=0`, and `active_marker=0`.
- Large accept confirmation hardening:
  - Accepting 30 or more candidates now asks for confirmation before writing a final note.
  - Canceling the confirmation shows `단어장 저장을 취소했습니다` and leaves the candidate note active.
  - Candidate sets below 30 are accepted without a confirmation dialog.
  - `docs/SPEC.md` and `docs/USAGE.md` document the 30-candidate threshold and cancel behavior.
- Runtime validation for large accept confirmation on item `9761`:
  - Installed XPI hash in the default profile: `118e6b6d2b47b8da1722b629ca5422f5ddfb6b2e7d1a40486debda514d4da268`.
  - Final rebuilt XPI was recopied to the default profile after documentation-only updates; final local/profile hash: `99682a1d112d95d41544da0c44dac263d66597394352ce2fb03a104883b79eb3`.
  - Advanced all-underlines mode created candidate note `9931`, `Vocab candidates (40)`.
  - Canceling the large-accept confirmation kept candidate note `9931` active and created no final note.
  - Confirming the same large-accept prompt created final note `9932`, `Vocab (40)`, and removed the active candidate note.
  - Cleanup trashed final note `9932`; read-only DB verification ended with `active_candidate=0`, `active_final=0`, and `active_marker=0`.
- Automatic translation hardening:
  - New menu entry: `빈 한국어 뜻 자동 채우기...`.
  - Translation is disabled by default and makes no network request while provider is `off`.
  - `extensions.vocabflow.translation.provider = google-free` enables an experimental no-key Google Translate endpoint.
  - Translation fills only blank `한국어 뜻` cells in generated final notes.
  - Manually entered Korean meanings are preserved.
  - Docs warn that `google-free` is experimental, may be rate-limited or blocked, and sends terms to an external endpoint.
- Runtime validation for opt-in automatic translation on item `9761`:
  - Final rebuilt XPI was recopied to the default profile; final local/profile hash: `21301db5166d726c9a678b0851978d24525a6dc61d2ff1422611b7651f43e4d1`.
  - Zotero `Tools > Developer > Run JavaScript` created temporary final vocab note `9941` with `polymer` already set to `수동뜻` and `actuator` blank.
  - Running the installed `빈 한국어 뜻 자동 채우기...` menu callback with `extensions.vocabflow.translation.provider = google-free` filled `actuator` as `액추에이터`.
  - The existing manual `polymer` meaning stayed `수동뜻`.
  - Cleanup trashed note `9941`, reset the provider to `off`, and ended with `afterCleanupActive=0`.
- Translation safety hardening after critical review:
  - Non-off providers now show an external-service confirmation before sending terms.
  - Translation runs with 30 or more blank meanings show an additional large-run confirmation.
  - The Google no-key provider keeps partial successes when one term fails.
  - Final-note meaning parsing now tolerates Zotero-added `<td>` attributes.
  - Candidate note copy now states meanings can be entered manually or filled later with the optional auto-fill command.
- Computer-use runtime verification after reinstalling XPI hash `9be7f56965ed6267e7efcd274dd7e78cd27f116203cb4a035b9826eae18c401a`:
  - Initial GUI pass exposed blank labels for non-green color extraction menus.
  - After adding color-specific Fluent IDs, the installed context menu showed all expected labels: `초록`, `노란`, `파란`, `보라`, `빨간`, `회색`, `vocab 태그`, `고급: 모든 밑줄`, `후보를 단어장으로 저장`, and `빈 한국어 뜻 자동 채우기...`.
  - Read-only DB cleanup check for item `9761` ended with active generated `data-vocab-flow` notes = `0`.
- Translation provider UX hardening:
  - `Vocab Flow` now exposes `실험 번역 보조 기능 켜기...` and `번역 보조 기능 끄기` menu commands.
  - Enabling `google-free` requires an external-service/stability confirmation before saving the provider preference.
  - Canceling the enable confirmation leaves the provider unchanged.
  - The disabled-translation toast now points users to the menu command instead of raw Zotero preference editing.
  - Final rebuilt XPI was recopied to the default profile; final local/profile hash: `8b4b4094b6527136bfc5478ab68bfb790c91e18ed1db06c07decd39c4214dc1f`.
- Translation no-result UX hardening:
  - Blank meaning cells that receive no provider result now return `untranslated` instead of `empty`.
  - Menu summaries now report `N개 번역 결과 없음` separately from `빈 뜻 없음`.
- Candidate review table UX hardening:
  - Candidate notes now render as `단어장 후보 (...)` with columns `용어 후보`, `저장 여부`, and `밑줄 문맥`.
  - Active decisions are displayed as `저장`; excluded decisions are displayed as `제외`.
  - Candidate type stays in `data-vocab-flow-type` for parser/debug use but is no longer a visible user-editing column.
  - Long source snippets are normalized and truncated to keep large all-underlines notes scannable.
  - Existing old-format candidate notes remain readable through a fallback parser.
- Researcher-facing wording hardening:
  - Candidate notes now use `용어 후보`, `저장 여부`, and `저장` instead of `후보`, `결정`, and `포함`.
  - Final notes now render as `단어장 (...)` with `용어` and `한국어 뜻` columns instead of `Vocab (...)` and `English`.
  - Existing `candidate`, `included`, `keep`, `포함`, and old four-cell rows remain accepted for backward compatibility.
- Candidate-stage clarity and professional bilingual wording:
  - Candidate notes now begin with `Review before translation`.
  - Candidate-note copy states that this is the review stage for sending only needed terms to the final vocab list.
  - Candidate table headers now render as `용어 후보 (Term candidate)`, `저장 여부 (Keep?)`, and `밑줄 문맥 (Context)`.
  - Final vocab table headers now render as `용어 (Term)` and `한국어 뜻 (Korean meaning)`.
  - Korean locale menu labels now use restrained bilingual terms, for example `term candidates`, `selected candidates`, and `Korean meanings`.
  - Installed Zotero runtime validation on item `1074` invoked the real `vocab-flow-extract-all` and `vocab-flow-accept` callbacks from `Zotero.MenuManager._optionsCache`.
  - Runtime label checks passed for `초록 밑줄에서 term candidates 만들기...`, `고급: 모든 밑줄에서 term candidates 만들기...`, `selected candidates로 단어장 만들기`, and `빈 Korean meanings 채우기...`.
  - Runtime candidate note `9964` contained `Review before translation`, the review-stage explanation, bilingual candidate headers, and `data-vocab-flow-scope="all"`.
  - Runtime final note `9965` contained `용어 (Term)` and `한국어 뜻 (Korean meaning)`.
  - Cleanup trashed runtime notes `9964` and `9965`; read-only immutable DB verification found active generated notes under item `1074` at `0`.
- Translation-aid positioning hardening:
  - Enable/disable labels now read `실험 번역 보조 기능 켜기...` and `번역 보조 기능 끄기`.
  - Disabled-provider and enable/disable toasts now describe a translation aid rather than a central automatic translation workflow.
  - Candidate notes now state that the translation aid does not replace candidate review.
  - Usage and product spec now frame Korean meaning fill as an optional aid after final vocab acceptance.
  - Installed Zotero runtime label check passed for translation-aid enable/disable labels, `빈 Korean meanings 채우기...`, and green `term candidates` extraction.
- Runtime validation for generated-note translation selection:
  - Runtime-validated XPI hash in the default profile: `b19ae47f096b4329c090ffd6a4ffad8431de08488123b2e42d3472cd8ef45c67`.
  - Zotero `MenuManager._optionsCache` contains `vocabflow@moon.com-vocabflow-library-item-menu` and the `vocab-flow-translate` command.
  - Zotero `Tools > Developer > Run JavaScript` created temporary generated final vocab note `9962` under parent item `1074` and invoked the installed `빈 한국어 뜻 자동 채우기...` callback with context `{ items: [note] }`.
  - The generated note selection resolved to its parent item and filled the blank `polymer` meaning as `중합체`.
  - Cleanup trashed note `9962`; read-only immutable DB verification found `deletedItems.itemID=9962` and `active_temp_vocab_notes=0`.
  - Final rebuilt XPI was recopied to the default profile after documentation updates; final local/profile hash: `31114930e10d8aebc138aa726129be463953f52b696ec29ca2f332f949cc0050`.
- Final rebuilt XPI after candidate-stage clarity, bilingual wording, translation-aid positioning, v0.1.0 release prep, and plugin icon replacement was recopied to the default profile; final local/profile hash: `14b2fd416f5e2dd2abe0fcf0330bd51617682f6d52f34df9d3b6e5347e3a357d`.

## Acceptance Checklist

- [x] Context menu wording no longer implies direct final extraction.
- [x] Generated output is a candidate review note tagged `_vocab-candidates`.
- [x] No final `_vocab-extract` note is created during candidate generation.
- [x] Candidate rows include source context.
- [x] Stopwords and malformed OCR fragments from the observed runtime note are removed.
- [x] Technical phrases are retained as phrase candidates.
- [x] Excluded candidates remain excluded across reruns.
- [x] Unit tests, typecheck, and build pass.
- [x] Zotero GUI/runtime validation confirms candidate note creation, rerun idempotency, accept flow, and cleanup.
- [x] DB read-only validation confirms no active test notes remain after cleanup.
- [x] Runtime validation confirms green-underlines default behavior and advanced all-underlines behavior.
- [x] Accept flow removes the active candidate note and leaves only the final vocab note before cleanup.
- [x] Candidate notes record their underline source scope.
- [x] User-facing usage documentation covers scope choice, review, exclusion, final save, and manual Korean meanings.
- [x] Generated note lookup is robust to missing Zotero tags when the Vocab Flow ownership marker is present.
- [x] Users are not forced to reserve green underlines; multiple color menus and `vocab` tag mode are available.
- [x] Runtime validation confirms color-specific menu registration, green color extraction, empty purple/tag paths, all-underlines extraction, accept flow, and cleanup.
- [x] Product/UX spec exists and captures non-goals, source-selection rules, data-safety invariants, and residual risks.
- [x] Color-specific feedback names the selected color in candidate notes and empty-result toasts.
- [x] Korean-first candidate exclusion works through `제외` and short `x` tokens.
- [x] All-underlines is presented as an advanced path in docs, locale labels, and empty-result summaries.
- [x] Final Zotero runtime validation after spec hardening confirms menu labels, candidate source text, Korean exclusion, empty purple/tag paths, advanced all-underlines, accept flow, and DB cleanup.
- [x] Large candidate accept requires confirmation and cancel avoids final-note writes.
- [x] Translation aid is opt-in, disabled by default, and preserves manually entered Korean meanings.
- [x] Translation aid requires an external-service confirmation when a provider is enabled.
- [x] Large translation-aid runs require confirmation before sending terms.
- [x] Partial translation failures do not discard successful meanings.
- [x] Final-note meaning parsing tolerates Zotero-added table-cell attributes.
- [x] Color-specific menu labels render for all six colors in the installed Zotero runtime.
- [x] Translation provider can be enabled/disabled through user-facing menu commands instead of a raw preference.
- [x] Provider no-result runs are reported separately from items with no blank meaning cells.
- [x] Candidate review notes use a compact Korean-first table and do not expose internal `candidate/type/decision/source` columns as the primary user interface.
- [x] Generated candidate and final notes use researcher-facing Korean labels instead of plugin-state wording.
