import { describe, expect, test } from '@jest/globals';

describe('nlp qa model', () => {
  test('tokenizeTextIntoNlpQaTokens returns deterministic offsets', async () => {
    const { tokenizeTextIntoNlpQaTokens } = await import('../docs/app/nlp-qa-model.js');

    expect(tokenizeTextIntoNlpQaTokens('A firearm-related role.')).toEqual([
      { text: 'A', start: 0, end: 1 },
      { text: 'firearm-related', start: 2, end: 17 },
      { text: 'role', start: 18, end: 22 }
    ]);
  });

  test('checkTextFieldWithNlpQa reports spelling and grammar issues', async () => {
    const {
      buildNlpQaLexicon,
      checkTextFieldWithNlpQa
    } = await import('../docs/app/nlp-qa-model.js');
    const lexicon = buildNlpQaLexicon({ words: ['entity'] });

    const result = checkTextFieldWithNlpQa('Entity that are firerm', { lexicon });

    expect(result.status).toBe('fail');
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'SUSPICIOUS_AGREEMENT',
      'MISSING_FINAL_PUNCTUATION',
      'UNKNOWN_WORD'
    ]));
    expect(result.issues.find((issue) => issue.text === 'firerm')?.start).toBe(16);
  });

  test('buildNlpQaLexicon includes the generated English dictionary asset', async () => {
    const { buildNlpQaLexicon } = await import('../docs/app/nlp-qa-model.js');
    const lexicon = buildNlpQaLexicon();

    expect(lexicon.has('chameleons')).toBe(true);
    expect(lexicon.has('regulated')).toBe(true);
  });

  test('checkTextFieldWithNlpQa honors modes and simple inflections', async () => {
    const {
      buildNlpQaLexicon,
      checkTextFieldWithNlpQa
    } = await import('../docs/app/nlp-qa-model.js');
    const lexicon = buildNlpQaLexicon({ words: ['regulate', 'entity'] });

    const grammarDisabled = checkTextFieldWithNlpQa('Entity that are regulated', {
      lexicon,
      checkModes: { spelling: true, grammar: false, aristotelian: false }
    });
    const aristotelianEnabled = checkTextFieldWithNlpQa('Regulated entity.', {
      lexicon,
      checkModes: { spelling: true, grammar: false, aristotelian: true }
    });

    expect(grammarDisabled.issues.map((issue) => issue.code)).not.toContain('SUSPICIOUS_AGREEMENT');
    expect(grammarDisabled.issues.map((issue) => issue.text)).not.toContain('regulated');
    expect(aristotelianEnabled.status).toBe('warning');
    expect(aristotelianEnabled.issues[0].code).toBe('ARISTOTELIAN_FORM_NOT_DETECTED');
  });
});
