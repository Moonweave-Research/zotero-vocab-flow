/*
 * Zotero Developer > Run JavaScript fixture for Vocab Flow color extraction.
 *
 * This script creates a temporary Zotero item with one PDF attachment and one
 * underline annotation for every supported Vocab Flow candidate color. It then
 * invokes the built Vocab Flow menu command path inside Zotero and verifies
 * that each color command produces candidates from only its matching annotation.
 *
 * Run inside Zotero, not Node:
 *   Tools -> Developer -> Run JavaScript
 *   paste this file, click Run
 */

const VOCAB_FLOW_COLOR_FIXTURE = {
  colors: [
    { name: 'green', color: '#5fb236', marker: 'green rheology actuator' },
    { name: 'yellow', color: '#ffd400', marker: 'yellow dielectric elastomer' },
    { name: 'blue', color: '#2ea8e5', marker: 'blue piezoelectric polymer' },
    { name: 'purple', color: '#a28ae5', marker: 'purple anisotropic hydrogel' },
    { name: 'red', color: '#ff6666', marker: 'red valence actuator' },
    { name: 'gray', color: '#aaaaaa', marker: 'gray ionic conductor' }
  ],
  repoRoot: globalThis.VOCAB_FLOW_REPO_ROOT ?? '/Users/choemun-yeong/workspace/projects/zotero/zotero-vocab-flow'
};

async function runVocabFlowColorFixture() {
  const startedAt = new Date().toISOString();
  const createdItemIDs = [];
  const generatedNoteIDs = [];
  let parentItem = null;
  let attachmentItem = null;

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function loadRuntimeExports() {
    let code = await IOUtils.readUTF8(`${VOCAB_FLOW_COLOR_FIXTURE.repoRoot}/addon/bootstrap.js`);
    code = code.replace(
      'return __toCommonJS(bootstrap_exports);',
      [
        'bootstrap_exports.__runtimeTest = {',
        '  VocabFlowMenuManager,',
        '  readUnderlineTexts,',
        '  extractForItem,',
        '  generateVocabCandidates,',
        '  writeCandidateNote,',
        '  discardCandidateNote',
        '};',
        'return __toCommonJS(bootstrap_exports);'
      ].join('\n')
    );
    const VocabFlowRuntime = eval(code + '\nVocabFlowBootstrap;');
    assert(
      VocabFlowRuntime.__runtimeTest?.VocabFlowMenuManager,
      `Vocab Flow runtime test exports not available; keys=${Object.keys(VocabFlowRuntime || {}).join(',')}`
    );
    return VocabFlowRuntime.__runtimeTest;
  }

  async function saveItem(item) {
    const id = await item.saveTx();
    createdItemIDs.push(id);
    return id;
  }

  async function createFixtureItem() {
    const libraryID = Zotero.Libraries.userLibraryID;
    parentItem = new Zotero.Item('journalArticle');
    parentItem.libraryID = libraryID;
    parentItem.setField('title', `Vocab Flow color runtime fixture ${startedAt}`);
    const parentID = await saveItem(parentItem);

    attachmentItem = new Zotero.Item('attachment');
    attachmentItem.libraryID = libraryID;
    attachmentItem.parentID = parentID;
    attachmentItem.setField('title', 'Vocab Flow color fixture.pdf');
    attachmentItem.attachmentContentType = 'application/pdf';
    attachmentItem.attachmentLinkMode = Zotero.Attachments.LINK_MODE_LINKED_FILE;
    attachmentItem.attachmentPath = 'vocab-flow-color-fixture.pdf';
    const attachmentID = await saveItem(attachmentItem);
    parentItem.getAttachments = () => [attachmentID];

    for (let index = 0; index < VOCAB_FLOW_COLOR_FIXTURE.colors.length; index += 1) {
      const fixture = VOCAB_FLOW_COLOR_FIXTURE.colors[index];
      const annotation = await Zotero.Annotations.saveFromJSON(attachmentItem, {
        key: Zotero.DataObjectUtilities.generateKey(),
        type: 'underline',
        text: fixture.marker,
        color: fixture.color,
        pageLabel: '1',
        sortIndex: `00001|${String(index + 1).padStart(6, '0')}|00001`,
        position: {
          pageIndex: 0,
          rects: [[72, 72 + index * 18, 240, 84 + index * 18]]
        },
        tags: []
      });
      createdItemIDs.push(annotation.id);
    }

    return parentItem;
  }

  async function getGeneratedNotes() {
    const noteIDs = new Set(parentItem.getNotes?.() ?? []);
    const dbNoteIDs = await Zotero.DB.columnQueryAsync(
      'SELECT itemID FROM itemNotes WHERE parentItemID=? AND note LIKE ?',
      [parentItem.id, '%data-vocab-flow-candidates="review"%']
    );
    for (const id of dbNoteIDs ?? []) noteIDs.add(id);
    return [...noteIDs]
      .map((id) => Zotero.Items.get(id))
      .filter((note) => note && !note.deleted && String(note.getNote?.() ?? '').includes('data-vocab-flow-candidates="review"'));
  }

  function extractTerms(note) {
    const html = String(note.getNote?.() ?? '');
    return [...html.matchAll(/data-vocab-flow-candidate="([^"]+)"/g)].map((match) => match[1]);
  }

  async function cleanup() {
    for (const note of await getGeneratedNotes()) {
      generatedNoteIDs.push(note.id);
      await note.eraseTx();
    }
    for (const id of createdItemIDs.slice().reverse()) {
      const item = Zotero.Items.get(id);
      if (item && !item.deleted) await item.eraseTx();
    }
  }

  try {
    const item = await createFixtureItem();
    const runtime = await loadRuntimeExports();
    const toasts = [];
    const manager = new runtime.VocabFlowMenuManager({
      extractForItem: (selectedItem, options) => runtime.extractForItem(selectedItem, undefined, { notify: false, ...options }),
      toast: (message) => toasts.push(message),
      showGeneratedNote: () => {}
    });
    const results = [];

    for (const fixture of VOCAB_FLOW_COLOR_FIXTURE.colors) {
      const preflightTexts = runtime.readUnderlineTexts(item, { scope: 'color', color: fixture.color });
      const preflightCandidates = runtime.generateVocabCandidates(preflightTexts).map((candidate) => candidate.label);
      await manager.runColorForTesting(fixture.color, { items: [item] });
      const notes = await getGeneratedNotes();
      assert(
        notes.length === 1,
        `${fixture.name} should leave exactly one generated candidate note, found ${notes.length}; texts=${JSON.stringify(preflightTexts)} candidates=${JSON.stringify(preflightCandidates)} toasts=${JSON.stringify(toasts)}`
      );
      const terms = extractTerms(notes[0]);
      const joined = terms.join(' | ').toLowerCase();
      assert(joined.includes(fixture.marker.split(' ')[1]), `${fixture.name} candidates did not include marker term from ${fixture.marker}`);

      for (const other of VOCAB_FLOW_COLOR_FIXTURE.colors) {
        if (other === fixture) continue;
        assert(!joined.includes(other.marker.split(' ')[1]), `${fixture.name} candidates leaked marker from ${other.name}`);
      }

      results.push({
        color: fixture.name,
        hex: fixture.color,
        noteID: notes[0].id,
        candidates: terms
      });
      generatedNoteIDs.push(notes[0].id);
      await notes[0].eraseTx();
    }

    await cleanup();
    return {
      ok: true,
      startedAt,
      parentItemID: parentItem.id,
      attachmentItemID: attachmentItem.id,
      results,
      cleanup: {
        generatedNoteIDs,
        createdItemIDs,
        activeGeneratedNotes: (await getGeneratedNotes()).length
      }
    };
  } catch (error) {
    await cleanup();
    return {
      ok: false,
      startedAt,
      errorMessage: String(error?.message ?? error),
      error: String(error && error.stack ? error.stack : error),
      cleanup: {
        generatedNoteIDs,
        createdItemIDs,
        activeGeneratedNotes: (await getGeneratedNotes()).length
      }
    };
  }
}

return runVocabFlowColorFixture();
