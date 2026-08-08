import { beforeEach, describe, expect, test } from '@jest/globals';
import N3 from 'n3';

function installWindow() {
  globalThis.window = { N3 };
}

describe('nlp qa ontology', () => {
  beforeEach(() => {
    installWindow();
  });

  test('extractNlpQaOntologyRowsFromRdfStore builds rows from RDF annotations', async () => {
    const { extractNlpQaOntologyRowsFromRdfStore } = await import('../docs/app/nlp-qa-ontology.js');
    const { namedNode, literal, quad } = N3.DataFactory;
    const store = new N3.Store([
      quad(
        namedNode('http://example.org/ClassA'),
        namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
        literal('Firearm')
      ),
      quad(
        namedNode('http://example.org/ClassA'),
        namedNode('http://www.w3.org/2004/02/skos/core#definition'),
        literal('An entity that is regulated.')
      ),
      quad(
        namedNode('http://example.org/ClassA'),
        namedNode('http://www.w3.org/2004/02/skos/core#example'),
        literal('This entity is used in an example.')
      ),
      quad(
        namedNode('http://example.org/ClassA'),
        namedNode('http://www.w3.org/2004/02/skos/core#scopeNote'),
        literal('Used for local quality assurance.')
      ),
      quad(
        namedNode('http://example.org/ClassA'),
        namedNode('http://www.ontologyrepository.com/CommonCoreOntologies/ont00001753'),
        literal('ABC')
      )
    ]);

    expect(extractNlpQaOntologyRowsFromRdfStore(store)).toEqual([
      {
        iri: 'http://example.org/ClassA',
        type: '',
        label: 'Firearm',
        prefLabel: '',
        definition: 'An entity that is regulated.',
        example: 'This entity is used in an example.',
        scopeNote: 'Used for local quality assurance.',
        acronym: 'ABC',
        modified: false
      }
    ]);
  });

  test('checkNlpQaOntologyTable checks memory rows and updateNlpQaOntologyRowsWithEditedField is immutable', async () => {
    const {
      buildNlpQaOntologyLexicon,
      checkNlpQaOntologyTable,
      updateNlpQaOntologyRowsWithEditedField
    } = await import('../docs/app/nlp-qa-ontology.js');
    const rows = [{
      iri: 'http://example.org/ClassA',
      type: '',
      label: 'Firearm',
      prefLabel: '',
      definition: 'Entity that are firerm',
      example: '',
      scopeNote: '',
      acronym: 'ABC',
      modified: false
    }];
    const lexicon = buildNlpQaOntologyLexicon(rows, { words: ['entity', 'firearm'] });

    const checked = checkNlpQaOntologyTable(rows, { lexicon });
    const updated = updateNlpQaOntologyRowsWithEditedField(rows, 'http://example.org/ClassA', 'definition', 'Entity that is firearm.');

    expect(checked.status).toBe('fail');
    expect(checked.issues.map((issue) => issue.fieldName)).toEqual(expect.arrayContaining(['definition']));
    expect(rows[0].definition).toBe('Entity that are firerm');
    expect(updated[0].definition).toBe('Entity that is firearm.');
    expect(updated[0].modified).toBe(true);
  });

  test('checkNlpQaOntologyTable applies field-specific checker norms', async () => {
    const {
      buildNlpQaOntologyLexicon,
      checkNlpQaOntologyTable
    } = await import('../docs/app/nlp-qa-ontology.js');
    const rows = [{
      iri: 'http://example.org/ClassA',
      type: '',
      label: 'Entity that are',
      prefLabel: 'Entity that are',
      definition: 'Regulated entity.',
      example: 'Example that are missing punctuation',
      scopeNote: 'Scope note that are missing punctuation',
      acronym: 'ABC',
      modified: false
    }];
    const lexicon = buildNlpQaOntologyLexicon(rows, {
      words: ['entity', 'regulated', 'example', 'missing', 'punctuation', 'scope', 'note']
    });

    const checked = checkNlpQaOntologyTable(rows, {
      lexicon,
      checkModes: { spelling: true, grammar: true, aristotelian: true }
    });
    const labelIssues = checked.issues.filter((issue) => issue.fieldName === 'label');
    const definitionIssues = checked.issues.filter((issue) => issue.fieldName === 'definition');
    const exampleIssues = checked.issues.filter((issue) => issue.fieldName === 'example');

    expect(labelIssues.map((issue) => issue.code)).not.toContain('SUSPICIOUS_AGREEMENT');
    expect(definitionIssues.map((issue) => issue.code)).toContain('ARISTOTELIAN_FORM_NOT_DETECTED');
    expect(exampleIssues.map((issue) => issue.code)).toContain('SUSPICIOUS_AGREEMENT');
    expect(exampleIssues.map((issue) => issue.code)).not.toContain('ARISTOTELIAN_FORM_NOT_DETECTED');
  });
});
