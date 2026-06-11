// Writes/updates a single tagged child note holding the vocab list.
// Spec §4.6 (1): idempotent via tag marker; never duplicates the note.

export const VOCAB_TAG = '_vocab-extract';
const GENERATED_BLOCK_PATTERN = /<section data-vocab-flow="words">[\s\S]*?<\/section>/;
const OWNERSHIP_MARKER = 'data-vocab-flow="words"';
const LEGACY_GENERATED_NOTE_PATTERN = /^<h2>Vocab \(\d+\)<\/h2><ul>[\s\S]*<\/ul>$/;

export type FillMeaningsResult =
  | { status: 'translated'; translatedCount: number }
  | { status: 'untranslated'; missingCount: number }
  | { status: 'empty' };

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

export async function fillMissingMeanings(parent: any, translate: (words: string[]) => Promise<Map<string, string>>): Promise<FillMeaningsResult> {
  const note = findExistingNote(parent);
  if (!note) return { status: 'empty' };

  const existingHtml = getNoteHtml(note);
  const missingWords = extractMissingMeaningWords(existingHtml);
  if (!missingWords.length) return { status: 'empty' };

  const translations = await translate(missingWords);
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

  if (!translatedCount) return { status: 'untranslated', missingCount: missingWords.length };
  note.setNote(updatedHtml);
  await note.saveTx();
  return { status: 'translated', translatedCount };
}

export function countMissingMeanings(parent: any): number {
  const note = findExistingNote(parent);
  if (!note) return 0;
  return extractMissingMeaningWords(getNoteHtml(note)).length;
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
    `<h2>단어장 (${words.length})</h2>`,
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
  return getNoteHtml(note).includes(OWNERSHIP_MARKER);
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
  return terms;
}

function extractMissingMeaningWords(html: string): string[] {
  const words: string[] = [];
  const rowPattern = /<tr[^>]*data-vocab-flow-word="([^"]*)"[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    if (normalizeCellText(match[2])) continue;
    words.push(decodeHtml(match[1]));
  }
  return words;
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
  if (GENERATED_BLOCK_PATTERN.test(existingHtml)) {
    return existingHtml.replace(GENERATED_BLOCK_PATTERN, generatedHtml);
  }
  return generatedHtml;
}
