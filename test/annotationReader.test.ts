import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CANDIDATE_COLOR, readUnderlineTexts } from '../src/annotationReader';

function annotation(type: string, text: string, sortIndex: string, color = DEFAULT_CANDIDATE_COLOR, tags: string[] = []) {
  return { annotationType: type, annotationText: text, annotationSortIndex: sortIndex, annotationColor: color, getTags: () => tags };
}

function setupZotero(attachmentsById: Record<number, any>) {
  (globalThis as any).Zotero = {
    Items: { get: (id: number) => attachmentsById[id] }
  };
}

test('collects only the default candidate-color underline annotations, preserving PDF order and sorting within each PDF', () => {
  const pdf1 = {
    isPDFAttachment: () => true,
    getAnnotations: (includeTrashed: boolean) => {
      assert.equal(includeTrashed, false); // spec §4.6 (3)
      return [
        annotation('underline', 'beta', '00002', '#5FB236'),
        annotation('underline', 'blue reading underline', '00001', '#2EA8E5'),
        annotation('highlight', 'IGNORED', '00001', '#5fb236')
      ];
    }
  };
  const pdf2 = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', 'alpha', '00001')]
  };
  setupZotero({ 10: pdf1, 11: pdf2 });
  const item = { getAttachments: () => [10, 11] };

  assert.deepEqual(readUnderlineTexts(item), ['beta', 'alpha']);
});

test('can collect all underline annotations for the advanced all-underlines mode', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [
      annotation('underline', 'green vocab underline', '00001', '#5fb236'),
      annotation('underline', 'yellow reading underline', '00002', '#ffd400')
    ]
  };
  setupZotero({ 12: pdf });

  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [12] }, { scope: 'all' }), [
    'green vocab underline',
    'yellow reading underline'
  ]);
});

test('collects a chosen candidate color without requiring tag typing', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [
      annotation('underline', 'green reading underline', '00001', '#5fb236'),
      annotation('underline', 'purple vocab underline', '00002', '#a28ae5')
    ]
  };
  setupZotero({ 15: pdf });

  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [15] }, { scope: 'color', color: '#a28ae5' }), [
    'purple vocab underline'
  ]);
});

test('collects vocab-tagged underlines regardless of color', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [
      annotation('underline', 'plain green underline', '00001', '#5fb236'),
      annotation('underline', 'tagged yellow underline', '00002', '#ffd400', ['vocab'])
    ]
  };
  setupZotero({ 16: pdf });

  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [16] }, { scope: 'tag', tagName: 'vocab' }), [
    'tagged yellow underline'
  ]);
});

test('returns empty when there are no candidate-color underlines in default scope', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', 'reading underline only', '00001', '#ffd400')]
  };
  setupZotero({ 13: pdf });

  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [13] }), []);
});

test('skips non-PDF attachments and empty annotation text', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', '  ', '00001'), annotation('underline', 'word', '00002')]
  };
  const epub = { isPDFAttachment: () => false, getAnnotations: () => [annotation('underline', 'X', '00001')] };
  setupZotero({ 20: pdf, 21: epub });
  const item = { getAttachments: () => [20, 21] };

  assert.deepEqual(readUnderlineTexts(item), ['word']);
});

test('sorts within a single PDF by sortIndex (not insertion order)', () => {
  const pdf = {
    isPDFAttachment: () => true,
    getAnnotations: () => [
      annotation('underline', 'later', '00005|00010'),
      annotation('underline', 'earlier', '00005|00002')
    ]
  };
  setupZotero({ 30: pdf });
  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [30] }), ['earlier', 'later']);
});

test('preserves PDF attachment order before sorting within each PDF', () => {
  const pdf1 = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', 'from first pdf', '00002')]
  };
  const pdf2 = {
    isPDFAttachment: () => true,
    getAnnotations: () => [annotation('underline', 'from second pdf', '00001')]
  };
  setupZotero({ 40: pdf1, 41: pdf2 });

  assert.deepEqual(readUnderlineTexts({ getAttachments: () => [40, 41] }), ['from first pdf', 'from second pdf']);
});

test('returns empty array when getAttachments returns null', () => {
  setupZotero({});
  assert.deepEqual(readUnderlineTexts({ getAttachments: () => null }), []);
});
