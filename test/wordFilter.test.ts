import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWords } from '../src/wordFilter';

test('splits on whitespace and dedupes case-insensitively, preserving first form', () => {
  assert.deepEqual(extractWords(['Polymer polymer POLYMER']), ['Polymer']);
});

test('strips surrounding punctuation but keeps internal hyphen', () => {
  assert.deepEqual(extractWords(['(cross-linked),']), ['cross-linked']);
});

test('keeps internal apostrophe', () => {
  assert.deepEqual(extractWords(["polymer's"]), ["polymer's"]);
});

test('drops single-char tokens and pure-number/symbol/hangul tokens', () => {
  assert.deepEqual(extractWords(['a viscosity 10 ?? 점도']), ['viscosity']);
});

test('rejoins line-break hyphenation (best-effort)', () => {
  assert.deepEqual(extractWords(['poly-\nmer']), ['polymer']);
});

test('multi-word selection splits into individual tokens', () => {
  assert.deepEqual(extractWords(['phase transition']), ['phase', 'transition']);
});

test('skips empty/whitespace strings', () => {
  assert.deepEqual(extractWords(['', '   ', 'actuator']), ['actuator']);
});

test('dedupes across separate array elements', () => {
  assert.deepEqual(extractWords(['polymer', 'Polymer']), ['polymer']);
});

test('drops common English stopwords from sentence underlines', () => {
  assert.deepEqual(
    extractWords(['The LCE matrix and the shell are used to balance stiffness']),
    ['LCE', 'matrix', 'shell', 'balance', 'stiffness']
  );
});
