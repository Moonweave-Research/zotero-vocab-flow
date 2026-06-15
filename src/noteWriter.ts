// Writes/updates a single tagged child note holding the vocab list.
// Spec §4.6 (1): idempotent via tag marker; never duplicates the note.

export const VOCAB_TAG = '_vocab-extract';
const GENERATED_SECTION_PATTERN = /<section data-vocab-flow="words">[\s\S]*?<\/section>/;
const GENERATED_SANITIZED_BLOCK_PATTERN = /<h2[^>]*>[\s\S]*?Vocab Flow Wordbook[\s\S]*?<\/h2>\s*<table[\s\S]*?<\/table>/;
const OWNERSHIP_MARKER = 'data-vocab-flow="words"';
const WORDBOOK_HEADING_MARKER = 'Vocab Flow Wordbook';
const LEGACY_GENERATED_NOTE_PATTERN = /^<h2>Vocab \(\d+\)<\/h2><ul>[\s\S]*<\/ul>$/;

export type FillMeaningsResult =
  | { status: 'translated'; translatedCount: number }
  | { status: 'untranslated'; missingCount: number }
  | { status: 'empty' };

export interface MeaningFillTerm {
  word: string;
  sourceText?: string;
  sourceIndex?: number;
}

export interface VocabTerm {
  label: string;
  sourceText?: string;
  sourceIndex?: number;
}

export type VocabTermInput = string | VocabTerm;

interface ExistingTermState {
  meaning: string;
  sourceText?: string;
  sourceIndex?: number;
}

export async function writeVocabNote(parent: any, words: VocabTermInput[]): Promise<any> {
  const note = findExistingNote(parent) ?? createNote(parent);
  const existingHtml = getNoteHtml(note);
  note.setNote(mergeGeneratedBlock(existingHtml, buildHtml(words, extractExistingTerms(existingHtml))));
  if (!note.hasTag(VOCAB_TAG)) note.addTag(VOCAB_TAG);
  await note.saveTx();
  return note;
}

export async function fillMissingMeanings(parent: any, translate: (terms: MeaningFillTerm[]) => Promise<Map<string, string>>): Promise<FillMeaningsResult> {
  const note = findExistingNote(parent);
  if (!note) return { status: 'empty' };

  const existingHtml = getNoteHtml(note);
  const missingTerms = extractMissingMeaningTerms(existingHtml);
  if (!missingTerms.length) return { status: 'empty' };

  const translations = await translate(missingTerms);
  let translatedCount = 0;
  const updatedHtml = existingHtml.replace(
    /(<tr[^>]*data-vocab-flow-word="([^"]*)"[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>)([\s\S]*?)(<\/td>\s*<\/tr>)/g,
    (row, prefix: string, encodedWord: string, meaning: string, suffix: string) => {
      if (normalizeCellText(meaning)) return row;
      const word = decodeHtml(encodedWord);
      const translated = translations.get(word) ?? translations.get(word.toLowerCase());
      if (!translated) return row;
      translatedCount++;
      return `${prefix}${escapeHtml(translated)}${suffix}`;
    }
  );

  const fallback = fillPlainWordbookMeanings(updatedHtml, translations);
  translatedCount += fallback.translatedCount;
  if (!translatedCount) return { status: 'untranslated', missingCount: missingTerms.length };
  note.setNote(fallback.html);
  await note.saveTx();
  return { status: 'translated', translatedCount };
}

export function countMissingMeanings(parent: any): number {
  const note = findExistingNote(parent);
  if (!note) return 0;
  return extractMissingMeaningTerms(getNoteHtml(note)).length;
}

function findExistingNote(parent: any): any | null {
  const noteIDs: number[] = parent.getNotes?.() ?? [];
  for (const id of noteIDs) {
    const note: any = Zotero.Items.get(id);
    if (!note) continue;
    if (hasOwnershipMarker(note)) {
      if (!note.hasTag?.(VOCAB_TAG)) note.addTag?.(VOCAB_TAG);
      return note;
    }
    if (note.hasTag?.(VOCAB_TAG) && isLegacyGeneratedNote(note)) return note;
  }
  return null;
}

function createNote(parent: any): any {
  const note = new (Zotero.Item as any)('note');
  note.parentID = parent.id; // zotero-types exposes `parentID` on dataObject, not parentItemID
  return note;
}

function buildHtml(words: VocabTermInput[], existingTerms: Map<string, ExistingTermState> = new Map()): string {
  const rows = words.map((input) => {
    const term = normalizeTerm(input);
    const existing = existingTerms.get(term.label.toLowerCase());
    const escaped = escapeHtml(term.label);
    const rowAttrs = buildRowAttributes(term, existing);
    const meaning = existing?.meaning ?? '';
    return `<tr ${rowAttrs}><td>${escaped}</td><td>${meaning}</td></tr>`;
  }).join('');
  return [
    '<section data-vocab-flow="words">',
    `<h2>단어장 (${words.length}) - Vocab Flow Wordbook</h2>`,
    '<table>',
    '<thead><tr><th>용어 (Term)</th><th>한국어 뜻 (Korean meaning)</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</section>'
  ].join('');
}

function normalizeTerm(input: VocabTermInput): VocabTerm {
  return typeof input === 'string' ? { label: input } : input;
}

function buildRowAttributes(term: VocabTerm, existing?: ExistingTermState): string {
  const attrs = [`data-vocab-flow-word="${escapeAttribute(term.label)}"`];
  const sourceIndex = term.sourceIndex ?? existing?.sourceIndex;
  const sourceText = term.sourceText ?? existing?.sourceText;
  if (sourceIndex !== undefined) attrs.push(`data-vocab-flow-source-index="${sourceIndex}"`);
  if (sourceText) attrs.push(`data-vocab-flow-source-text="${escapeAttribute(sourceText)}"`);
  return attrs.join(' ');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

function getNoteHtml(note: any): string {
  return note?.getNote?.() ?? note?.note ?? '';
}

function hasOwnershipMarker(note: any): boolean {
  const html = getNoteHtml(note);
  return html.includes(OWNERSHIP_MARKER) || hasSanitizedWordbookBlock(html);
}

function isLegacyGeneratedNote(note: any): boolean {
  return LEGACY_GENERATED_NOTE_PATTERN.test(getNoteHtml(note).trim());
}

function extractExistingTerms(html: string): Map<string, ExistingTermState> {
  const terms = new Map<string, ExistingTermState>();
  const rowPattern = /<tr[^>]*data-vocab-flow-word="([^"]*)"[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    const word = decodeHtml(match[1]).toLowerCase();
    const rowHtml = match[0];
    const sourceIndexText = extractAttribute(rowHtml, 'data-vocab-flow-source-index');
    const sourceIndex = sourceIndexText === null ? undefined : Number.parseInt(sourceIndexText, 10);
    terms.set(word, {
      meaning: match[2],
      sourceText: extractAttribute(rowHtml, 'data-vocab-flow-source-text') ?? undefined,
      sourceIndex: Number.isFinite(sourceIndex) ? sourceIndex : undefined
    });
  }
  for (const row of extractPlainWordbookRows(html)) {
    if (terms.has(row.word.toLowerCase())) continue;
    terms.set(row.word.toLowerCase(), {
      meaning: escapeHtml(normalizeCellText(row.meaningHtml))
    });
  }
  return terms;
}

function extractMissingMeaningTerms(html: string): MeaningFillTerm[] {
  const terms: MeaningFillTerm[] = [];
  const seen = new Set<string>();
  const rowPattern = /<tr[^>]*data-vocab-flow-word="([^"]*)"[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    const word = decodeHtml(match[1]);
    seen.add(word.toLowerCase());
    if (normalizeCellText(match[2])) continue;
    const rowHtml = match[0];
    const sourceIndexText = extractAttribute(rowHtml, 'data-vocab-flow-source-index');
    const sourceIndex = sourceIndexText === null ? undefined : Number.parseInt(sourceIndexText, 10);
    terms.push({
      word,
      sourceText: extractAttribute(rowHtml, 'data-vocab-flow-source-text') ?? undefined,
      sourceIndex: Number.isFinite(sourceIndex) ? sourceIndex : undefined
    });
  }
  for (const row of extractPlainWordbookRows(html)) {
    const key = row.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (normalizeCellText(row.meaningHtml)) continue;
    terms.push({ word: row.word });
  }
  return terms;
}

function hasSanitizedWordbookBlock(html: string): boolean {
  return GENERATED_SANITIZED_BLOCK_PATTERN.test(html)
    && /용어 \(Term\)|Term/.test(html)
    && /한국어 뜻 \(Korean meaning\)|Korean meaning|뜻/.test(html);
}

function extractPlainWordbookRows(html: string): Array<{ word: string; meaningHtml: string }> {
  if (!html.includes(WORDBOOK_HEADING_MARKER)) return [];
  const rows: Array<{ word: string; meaningHtml: string }> = [];
  for (const rowHtml of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = extractCellMatches(rowHtml);
    if (cells.length < 2) continue;
    const word = normalizeCellText(cells[0].inner);
    const meaning = cells[1].inner;
    if (!word || isWordbookHeader(word, normalizeCellText(meaning))) continue;
    rows.push({ word, meaningHtml: meaning });
  }
  return rows;
}

function isWordbookHeader(firstCell: string, secondCell: string): boolean {
  const first = firstCell.toLowerCase();
  const second = secondCell.toLowerCase();
  return (first.includes('용어') || first.includes('term')) && (second.includes('meaning') || second.includes('뜻'));
}

function fillPlainWordbookMeanings(html: string, translations: Map<string, string>): { html: string; translatedCount: number } {
  let translatedCount = 0;
  if (!html.includes(WORDBOOK_HEADING_MARKER)) return { html, translatedCount };
  const updated = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/g, (rowHtml) => {
    const cells = extractCellMatches(rowHtml);
    if (cells.length < 2) return rowHtml;
    const word = normalizeCellText(cells[0].inner);
    const meaning = normalizeCellText(cells[1].inner);
    if (!word || meaning || isWordbookHeader(word, meaning)) return rowHtml;
    const translated = translations.get(word) ?? translations.get(word.toLowerCase());
    if (!translated) return rowHtml;
    translatedCount++;
    const replacement = `${cells[1].prefix}${replaceCellText(cells[1].inner, translated)}${cells[1].suffix}`;
    return `${rowHtml.slice(0, cells[1].start)}${replacement}${rowHtml.slice(cells[1].end)}`;
  });
  return { html: updated, translatedCount };
}

function replaceCellText(innerHtml: string, text: string): string {
  const escaped = escapeHtml(text);
  if (/<p\b[^>]*>[\s\S]*?<\/p>/i.test(innerHtml)) {
    return innerHtml.replace(/(<p\b[^>]*>)[\s\S]*?(<\/p>)/i, `$1${escaped}$2`);
  }
  return escaped;
}

function extractCellMatches(rowHtml: string): Array<{ prefix: string; inner: string; suffix: string; start: number; end: number }> {
  return [...rowHtml.matchAll(/(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/g)].map((match) => ({
    prefix: match[1],
    inner: match[2],
    suffix: match[3],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length
  }));
}

function normalizeCellText(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function extractAttribute(html: string, name: string): string | null {
  const match = html.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeHtml(match[1]) : null;
}

function mergeGeneratedBlock(existingHtml: string, generatedHtml: string): string {
  if (!existingHtml) return generatedHtml;
  if (GENERATED_SECTION_PATTERN.test(existingHtml)) {
    return existingHtml.replace(GENERATED_SECTION_PATTERN, generatedHtml);
  }
  if (GENERATED_SANITIZED_BLOCK_PATTERN.test(existingHtml)) {
    return existingHtml.replace(GENERATED_SANITIZED_BLOCK_PATTERN, generatedHtml);
  }
  return generatedHtml;
}
