import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVocabCandidates } from '../src/candidateExtractor';

test('drops noisy function words and malformed OCR fragments while retaining domain terms', () => {
  const candidates = generateVocabCandidates([
    'These knots use their shell between high stiffness and strength.',
    'he black arrows indicate flippin stiffn ncreasing',
    'LCE matrix and CNTs enhance Young’s modulus.'
  ]);

  const labels = candidates.map((candidate) => candidate.label);
  assert.deepEqual(labels, [
    'LCE matrix',
    'CNTs',
    'Young’s modulus',
    'knots',
    'shell',
    'high stiffness',
    'strength',
    'enhance'
  ]);
});

test('keeps source text and candidate type for review', () => {
  const candidates = generateVocabCandidates(['liquid crystal elastomer actuator']);

  assert.deepEqual(candidates.map((candidate) => ({
    label: candidate.label,
    type: candidate.type,
    sourceText: candidate.sourceText,
    sourceIndex: candidate.sourceIndex
  })), [
    {
      label: 'liquid crystal elastomer',
      type: 'phrase',
      sourceText: 'liquid crystal elastomer actuator',
      sourceIndex: 1
    },
    {
      label: 'actuator',
      type: 'word',
      sourceText: 'liquid crystal elastomer actuator',
      sourceIndex: 1
    }
  ]);
});

test('rejects formula fragments and weak general words from runtime underline text', () => {
  const candidates = generateVocabCandidates([
    'Ntwi and Ntw were calculated from Yeff for different numbers of samples.',
    'The error bars indicate the standard deviation.'
  ]);

  assert.deepEqual(candidates.map((candidate) => candidate.label), [
    'standard deviation'
  ]);
});
