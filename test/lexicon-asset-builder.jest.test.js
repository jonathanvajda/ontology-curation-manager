import { describe, expect, test } from '@jest/globals';

describe('lexicon asset builder', () => {
  test('buildEnglishLexiconWordsFromPosLexicon filters noisy entries', async () => {
    const {
      buildEnglishLexiconWordsFromPosLexicon
    } = await import('../src/lexicon-build/lexicon-asset-builder.js');

    const words = buildEnglishLexiconWordsFromPosLexicon({
      "'": ['"'],
      Ranavan: ['NNP'],
      'pro-Soviet': ['JJ'],
      'Hawaiian\\/Japanese': ['JJ'],
      chameleons: ['NNS'],
      clotted: ['JJ'],
      hanging: ['VBG', 'JJ', 'NN'],
      i: ['PRP']
    });

    expect(words).toEqual([
      'chameleons',
      'clotted',
      'hanging',
      'i',
      'pro-soviet'
    ]);
  });

  test('loadPosLexiconFromSourceText supports postagger and exported lexicon sources', async () => {
    const {
      loadPosLexiconFromSourceText
    } = await import('../src/lexicon-build/build-english-lexicon.js');

    expect(loadPosLexiconFromSourceText('window.POSTAGGER_LEXICON = { fawn: ["NN"] };')).toEqual({
      fawn: ['NN']
    });
    expect(loadPosLexiconFromSourceText('export const lexicon = { acquired: "VBN|JJ|VBD" };')).toEqual({
      acquired: 'VBN|JJ|VBD'
    });
    expect(loadPosLexiconFromSourceText('export interface LexiconType { [key:string]:string } const lexicon = <LexiconType> { fawn: "NN" }; export default lexicon;')).toEqual({
      fawn: 'NN'
    });
  });

  test('renderEnglishLexiconAssetModule emits a deterministic module', async () => {
    const {
      renderEnglishLexiconAssetModule
    } = await import('../src/lexicon-build/lexicon-asset-builder.js');

    const moduleText = renderEnglishLexiconAssetModule(['zeta', 'alpha', 'alpha'], {
      sourceLabel: 'sample.js'
    });

    expect(moduleText).toContain('Source: sample.js');
    expect(moduleText).toContain('"alpha"');
    expect(moduleText.indexOf('"alpha"')).toBeLessThan(moduleText.indexOf('"zeta"'));
  });
});
