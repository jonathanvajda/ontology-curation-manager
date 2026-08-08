import { COMMON_NAMESPACE_IRIS } from '../docs/app/shared/namespace-registry/index.js';

describe('nlp qa storage', () => {
  test('createNlpQaStateJsonLd stores durable state with full IRI keys', async () => {
    const { createNlpQaStateJsonLd } = await import('../docs/app/nlp-qa-storage.js');

    const state = createNlpQaStateJsonLd({
      fileName: 'example.ttl',
      rows: [{
        iri: 'http://example.org/Entity',
        type: COMMON_NAMESPACE_IRIS.owl.Class,
        label: 'Entity',
        prefLabel: 'Entity',
        definition: 'An entity.',
        example: '',
        scopeNote: '',
        acronym: '',
        modified: true
      }],
      filter: 'modified',
      scratchCheckModes: { spelling: true, grammar: false, aristotelian: false },
      ontologyCheckModes: { spelling: true, grammar: true, aristotelian: true },
      scratch: { text: 'Entity that are.', status: 'warning', issues: [], checkModes: { spelling: true } }
    }, {
      stateId: 'urn:uuid:00000000-0000-4000-8000-000000000001',
      updatedAt: '2026-08-08T12:00:00.000Z'
    });

    expect(state['@context']).toBeTruthy();
    expect(state['@id']).toBe('urn:uuid:00000000-0000-4000-8000-000000000001');
    expect(state[COMMON_NAMESPACE_IRIS.dcterms.modified]).toEqual({
      '@value': '2026-08-08T12:00:00.000Z',
      '@type': COMMON_NAMESPACE_IRIS.xsd.dateTime
    });
    expect(state[COMMON_NAMESPACE_IRIS.okea.fileName]).toEqual({
      '@value': 'example.ttl',
      '@type': COMMON_NAMESPACE_IRIS.xsd.string
    });
    expect(state[COMMON_NAMESPACE_IRIS.rdf.value][0][COMMON_NAMESPACE_IRIS.rdfs.label]).toEqual({
      '@value': 'Entity',
      '@type': COMMON_NAMESPACE_IRIS.xsd.string
    });
    expect(state[COMMON_NAMESPACE_IRIS.rdf.value][0][COMMON_NAMESPACE_IRIS.skos.definition]).toEqual({
      '@value': 'An entity.',
      '@type': COMMON_NAMESPACE_IRIS.xsd.string
    });
    expect(Object.keys(state).some((key) => key === 'updatedAt' || key === 'payload' || key === 'rows')).toBe(false);
  });

  test('readNlpQaStatePayloadFromJsonLd restores the page state payload', async () => {
    const {
      createNlpQaStateJsonLd,
      readNlpQaStatePayloadFromJsonLd
    } = await import('../docs/app/nlp-qa-storage.js');

    const state = createNlpQaStateJsonLd({
      fileName: 'example.ttl',
      rows: [{
        iri: 'http://example.org/Entity',
        type: COMMON_NAMESPACE_IRIS.owl.Class,
        label: 'Entity',
        prefLabel: '',
        definition: 'An entity.',
        example: '',
        scopeNote: '',
        acronym: '',
        modified: false
      }],
      filter: 'all',
      scratch: { text: 'Scratch text.', status: 'pass', issues: [] }
    });

    const payload = readNlpQaStatePayloadFromJsonLd(state);

    expect(payload.fileName).toBe('example.ttl');
    expect(payload.filter).toBe('all');
    expect(payload.rows).toEqual([{
      iri: 'http://example.org/Entity',
      type: COMMON_NAMESPACE_IRIS.owl.Class,
      label: 'Entity',
      prefLabel: '',
      definition: 'An entity.',
      example: '',
      scopeNote: '',
      acronym: '',
      modified: false
    }]);
    expect(payload.scratch.text).toBe('Scratch text.');
  });
});
