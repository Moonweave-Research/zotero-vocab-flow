// Writes/updates a single tagged child note holding the vocab list.
// Spec §4.6 (1): idempotent via tag marker; never duplicates the note.

export const VOCAB_TAG = '_vocab-extract';

export async function writeVocabNote(parent: any, words: string[]): Promise<any> {
  const note = findExistingNote(parent) ?? createNote(parent);
  note.setNote(buildHtml(words));
  if (!note.hasTag(VOCAB_TAG)) note.addTag(VOCAB_TAG);
  await note.saveTx();
  return note;
}

function findExistingNote(parent: any): any | null {
  const noteIDs: number[] = parent.getNotes?.() ?? [];
  for (const id of noteIDs) {
    const note: any = Zotero.Items.get(id);
    if (note?.hasTag?.(VOCAB_TAG)) return note;
  }
  return null;
}

function createNote(parent: any): any {
  const note = new (Zotero.Item as any)('note');
  note.parentID = parent.id; // zotero-types exposes `parentID` on dataObject, not parentItemID
  return note;
}

function buildHtml(words: string[]): string {
  const items = words.map((word) => `<li>${escapeHtml(word)}</li>`).join('');
  return `<h2>Vocab (${words.length})</h2><ul>${items}</ul>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
