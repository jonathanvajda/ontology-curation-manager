import { describe, expect, test } from '@jest/globals';
import {
  cssEscapeAttr,
  escapeHtml,
  getReportStandards
} from '../docs/app/shared.js';
import { normalizeStringToAsciiSlug } from '../docs/app/shared/normalization-utils/index.js';
import { escapeDelimitedCell, serializeDelimitedRows } from '../docs/app/shared/tabular-io/index.js';

describe('shared helpers', () => {
  test('escapeHtml escapes reserved HTML characters', () => {
    expect(escapeHtml(`<tag attr="x">'&`)).toBe('&lt;tag attr=&quot;x&quot;&gt;&#39;&amp;');
  });

  test('cssEscapeAttr escapes double quotes for attribute selectors', () => {
    expect(cssEscapeAttr('a"b')).toBe('a\\"b');
  });

  test('promoted ASCII slug normalizer covers legacy file-name fragments', () => {
    expect(normalizeStringToAsciiSlug('  ontology report: v1/owl  ', { separator: '_' })).toBe('ontology_report_v1_owl');
  });

  test('shared tabular-io CSV helpers preserve commas, quotes, and newlines', () => {
    expect(escapeDelimitedCell('a,"b"', { delimiter: ',' })).toBe('"a,""b"""');
    expect(serializeDelimitedRows([['id', 'value'], ['1', 'line 1\nline 2']], { trailingNewline: true })).toBe(
      'id,value\n1,"line 1\nline 2"\n'
    );
  });

  test('getReportStandards returns a safe empty array for missing reports', () => {
    expect(getReportStandards(null)).toEqual([]);
    expect(getReportStandards({ standards: [{ id: 'STD:1' }] })).toEqual([{ id: 'STD:1' }]);
  });
});
