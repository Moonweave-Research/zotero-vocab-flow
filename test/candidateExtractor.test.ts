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
    'strength'
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

test('dehyphenates line-wrapped words before extracting vocab candidates', () => {
  const candidates = generateVocabCandidates(['poly-\nmer actuator']);

  const labels = candidates.map((candidate) => candidate.label);
  assert.ok(labels.includes('polymer'));
  assert.ok(!labels.includes('poly'));
  assert.ok(labels.includes('actuator'));
});

test('rejects mistranslation-prone generic words and OCR-confusable non-terms', () => {
  const candidates = generateVocabCandidates([
    'The valance elements remained stable while the valence state changed.'
  ]);

  assert.deepEqual(candidates.map((candidate) => candidate.label), [
    'valence'
  ]);
});

test('filters generic academic prose from all-underlines runtime extraction while preserving technical terms', () => {
  const candidates = generateVocabCandidates([
    'LCE matrix (materials and methods and fig. S3)',
    'These knots, with minimal crossings',
    'CNTs and CNCs to enhance LCE stiffness and strength',
    'LCEs with 1 wt % CNTs and 1 wt % CNCs are used as the shell to balance stiffness and strength for actuation (fig. S3).',
    'Kevlar monofilaments',
    'The LCE-Kevlar fibers exhibit an effective Young’s modulus (Yeff) up to 4.3 GPa',
    'The loadings and Ntwi balance the trade-off between stiffness, strength, lightweight features, and actuation strain.',
    'Ntwi enables actuation and enhances stiffn',
    'Ashby plot comparing the Young’s modulus-to-density and strength-to-density ratios',
    'the standard deviation (N = 3).'
  ]);

  const labels = candidates.map((candidate) => candidate.label);
  assert.deepEqual(labels, [
    'LCE matrix',
    'CNTs',
    'CNCs',
    'LCEs',
    'Kevlar',
    'LCE-Kevlar',
    'GPa',
    'Young’s modulus',
    'knots',
    'crossings',
    'stiffness',
    'strength',
    'shell',
    'actuation',
    'monofilaments',
    'fibers',
    'loadings',
    'trade-off',
    'lightweight',
    'Ashby plot',
    'modulus-to-density',
    'strength-to-density',
    'standard deviation'
  ]);
  assert.ok(!labels.includes('minimal'));
  assert.ok(!labels.includes('materials'));
  assert.ok(!labels.includes('methods'));
  assert.ok(!labels.includes('features'));
  assert.ok(!labels.includes('enables'));
  assert.ok(!labels.includes('enhances'));
  assert.ok(!labels.includes('balance'));
  assert.ok(!labels.includes('exhibit'));
  assert.ok(!labels.includes('effective'));
  assert.ok(!labels.includes('comparing'));
  assert.ok(!labels.includes('ratios'));
});

test('uses representative paper underline fixtures to keep technical phrases and drop prose glue', () => {
  const candidates = generateVocabCandidates([
    'The shape-morphing LCE actuator showed photothermal response under near-infrared irradiation.',
    'Single-cell RNA sequencing identified microglia activation signatures after cytokine exposure.',
    'Transformer attention maps were evaluated with SHAP explanations across validation folds.'
  ]);

  const labels = candidates.map((candidate) => candidate.label);
  assert.ok(labels.includes('near-infrared irradiation'));
  assert.ok(labels.includes('Single-cell RNA sequencing'));
  assert.ok(labels.includes('microglia activation'));
  assert.ok(labels.includes('attention maps'));
  assert.ok(labels.includes('LCE'));
  assert.ok(labels.includes('SHAP'));
  assert.ok(labels.includes('cytokine'));
  assert.ok(!labels.includes('showed'));
  assert.ok(!labels.includes('under'));
  assert.ok(!labels.includes('after'));
  assert.ok(!labels.includes('evaluated'));
  assert.ok(!labels.includes('across'));
});
