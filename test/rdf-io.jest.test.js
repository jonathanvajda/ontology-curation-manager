import { describe, expect, test } from '@jest/globals';
import N3 from 'n3';

import {
  convertRdflibTermToRdfJs,
  detectRdfFormat,
  isSupportedRdfFileName,
  normalizeRdfFormat,
  parseRdfInput,
  RDF_FORMATS,
  serializeRdfStore
} from '../docs/app/rdf-io.js';

describe('rdf-io', () => {
  test('normalizes aliases and detects supported input formats', () => {
    expect(normalizeRdfFormat('ttl')).toBe(RDF_FORMATS.TURTLE);
    expect(normalizeRdfFormat('json-ld')).toBe(RDF_FORMATS.JSON_LD);
    expect(normalizeRdfFormat('application/rdf+xml')).toBe(RDF_FORMATS.RDF_XML);
    expect(normalizeRdfFormat('nq')).toBe(RDF_FORMATS.N_QUADS);

    expect(detectRdfFormat('example.ttl')).toBe(RDF_FORMATS.TURTLE);
    expect(detectRdfFormat('example.trig')).toBe(RDF_FORMATS.TRIG);
    expect(detectRdfFormat('example.jsonld')).toBe(RDF_FORMATS.JSON_LD);
    expect(detectRdfFormat('example.rdf')).toBe(RDF_FORMATS.RDF_XML);
    expect(detectRdfFormat('example.unknown')).toBe(RDF_FORMATS.TURTLE);

    expect(isSupportedRdfFileName('one.ttl')).toBe(true);
    expect(isSupportedRdfFileName('one.owl')).toBe(true);
    expect(isSupportedRdfFileName('one.txt')).toBe(false);
  });

  test('converts rdflib terms including collection list expansion', () => {
    const runtime = { N3 };
    const store = new N3.Store();

    const typedLiteral = convertRdflibTermToRdfJs({
      termType: 'Literal',
      value: '3',
      datatype: { value: 'http://www.w3.org/2001/XMLSchema#integer' },
      language: ''
    }, runtime);
    expect(typedLiteral.termType).toBe('Literal');
    expect(typedLiteral.datatype?.value).toBe('http://www.w3.org/2001/XMLSchema#integer');

    const head = convertRdflibTermToRdfJs({
      termType: 'Collection',
      value: 'collectionHead',
      elements: [
        { termType: 'NamedNode', value: 'http://example.org/one' },
        {
          termType: 'Literal',
          value: 'two',
          datatype: { value: 'http://www.w3.org/2001/XMLSchema#string' },
          language: ''
        }
      ]
    }, runtime, store);

    expect(head.termType).toBe('BlankNode');
    expect(store.size).toBe(4);
    expect(
      store.getQuads(
        head,
        N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        null,
        null
      )
    ).toHaveLength(1);
  });

  test('parses and serializes N3-compatible syntaxes through the core path', async () => {
    const runtime = { N3 };
    const parsed = await parseRdfInput(
      '@prefix ex: <http://example.org/> . ex:onto <http://www.w3.org/2000/01/rdf-schema#label> "Example" .',
      'onto.ttl',
      { runtime }
    );

    expect(parsed.sourceFormat).toBe(RDF_FORMATS.TURTLE);
    expect(parsed.store.size).toBe(1);

    const serialized = await serializeRdfStore(parsed.store, RDF_FORMATS.N_TRIPLES, {
      runtime,
      prefixes: parsed.prefixes,
      baseIri: parsed.baseIri
    });
    const reparsed = await parseRdfInput(serialized, 'onto.nt', { runtime });

    expect(reparsed.store.size).toBe(1);
  });

  test('parses JSON-LD and rejects malformed or unsupported input', async () => {
    const runtime = {
      N3,
      jsonld: {
        async toRDF(documentValue) {
          expect(documentValue['@id']).toBe('http://example.org/onto');
          return '<http://example.org/onto> <http://www.w3.org/2000/01/rdf-schema#label> "Example" .';
        }
      }
    };

    const parsed = await parseRdfInput(
      JSON.stringify({ '@id': 'http://example.org/onto' }),
      'onto.jsonld',
      { runtime }
    );
    expect(parsed.sourceFormat).toBe(RDF_FORMATS.JSON_LD);
    expect(parsed.store.size).toBe(1);

    await expect(parseRdfInput('{not json}', 'broken.jsonld', { runtime })).rejects.toThrow(/Invalid JSON-LD/);
    await expect(parseRdfInput('hello', 'broken.txt', { runtime: { N3 } })).rejects.toThrow(/Unsupported ontology file type/);
  });
});
