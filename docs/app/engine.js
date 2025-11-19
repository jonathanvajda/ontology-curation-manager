// app/engine.js
// Phase 1: core logic for running manifest-driven queries against an uploaded ontology

import { Parser, Store } from 'n3';
import { newEngine } from '@comunica/query-sparql';

const comunicaEngine = newEngine();

/**
 * Best-effort guess of N3 parser format from file name.
 * For Phase 1, assume TTL; you can extend later.
 */
function guessFormatFromFilename(name) {
  if (!name) return 'text/turtle';
  const lower = name.toLowerCase();
  if (lower.endsWith('.ttl') || lower.endsWith('.turtle')) return 'text/turtle';
  if (lower.endsWith('.nt') || lower.endsWith('.ntriples')) return 'application/n-triples';
  if (lower.endsWith('.nq')) return 'application/n-quads';
  if (lower.endsWith('.trig')) return 'application/trig';
  if (lower.endsWith('.rdf') || lower.endsWith('.owl') || lower.endsWith('.xml')) return 'application/rdf+xml';
  if (lower.endsWith('.jsonld')) return 'application/ld+json';
  return 'text/turtle';
}

/**
 * Parse text into an N3.Store.
 * For Phase 1, we assume Turtle/N-Triples-like syntax and let N3 handle it.
 */
export async function loadOntologyIntoStore(text, filename = 'ontology.ttl') {
  const format = guessFormatFromFilename(filename);
  const parser = new Parser({ format });
  const store = new Store();
  const quads = parser.parse(text);
  store.addQuads(quads);
  return store;
}

/**
 * Helper to run a SELECT query and gather bindings as plain objects.
 */
async function runSelect(store, sparql) {
  const result = await comunicaEngine.queryBindings(sparql, {
    sources: [{ type: 'rdfjsSource', value: store }]
  });

  const rows = [];
  for await (const binding of result) {
    const obj = {};
    for (const [varName, term] of binding.entries()) {
      obj[varName] = term.value;
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Helper to run an ASK query and return a boolean.
 */
async function runAsk(store, sparql) {
  const result = await comunicaEngine.queryBoolean(sparql, {
    sources: [{ type: 'rdfjsSource', value: store }]
  });
  return result; // already a boolean
}

/**
 * Fetch and parse the manifest JSON.
 */
export async function loadManifest(url = './queries/manifest.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Fetch query text given a manifest entry.
 */
async function loadQueryText(queryMeta, basePath = './queries/') {
  const url = basePath + queryMeta.file;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch query ${queryMeta.id} from ${url}`);
  return res.text();
}

/**
 * Very simple ontology IRI heuristic:
 * Try to find a subject typed as owl:Ontology; otherwise fall back to a fixed IRI.
 */
function guessOntologyIri(store) {
  const OWL_ONTOLOGY = 'http://www.w3.org/2002/07/owl#Ontology';
  for (const quad of store.match(null, null, null)) {
    if (
      quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      quad.object.value === OWL_ONTOLOGY
    ) {
      return quad.subject.value;
    }
  }
  // fallback
  return 'urn:ontology:unknown';
}

/**
 * Normalize the outcome of running a single query into a standard array of rows.
 * Each row:
 * {
 *   resource: IRI (or ontology IRI),
 *   queryId,
 *   requirementId,
 *   status: "pass" | "fail",
 *   severity,
 *   scope,
 *   details: {}
 * }
 */
async function evaluateSingleQuery(store, qMeta, queryText) {
  const requirementId = qMeta.checksConformityTo ?? null;
  const severity = qMeta.severity ?? 'info';
  const scope = qMeta.scope ?? 'resource';

  // SELECT-style queries
  if (qMeta.kind === 'SELECT') {
    const rows = await runSelect(store, queryText);

    // For Phase 1, assume SELECT queries are violation-style and bind ?resource
    if (qMeta.polarity === 'matchMeansFail') {
      return rows.map(row => ({
        resource: row.resource ?? null,
        queryId: qMeta.id,
        requirementId,
        status: 'fail',
        severity,
        scope,
        details: row // keep all raw bindings as details
      }));
    }

    // You can extend later with different polarities/semantics
    return rows.map(row => ({
      resource: row.resource ?? null,
      queryId: qMeta.id,
      requirementId,
      status: 'fail', // default until we add more modes
      severity,
      scope,
      details: row
    }));
  }

  // ASK-style queries
  if (qMeta.kind === 'ASK') {
    const ok = await runAsk(store, queryText);
    let status;

    if (qMeta.polarity === 'trueMeansPass') {
      status = ok ? 'pass' : 'fail';
    } else if (qMeta.polarity === 'trueMeansFail') {
      status = ok ? 'fail' : 'pass';
    } else {
      // default
      status = ok ? 'pass' : 'fail';
    }

    const ontologyIri = guessOntologyIri(store);

    return [
      {
        resource: ontologyIri, // ontology-level
        queryId: qMeta.id,
        requirementId,
        status,
        severity,
        scope,
        details: { askResult: ok }
      }
    ];
  }

  // Unknown kind
  console.warn(`Unknown query kind for ${qMeta.id}:`, qMeta.kind);
  return [];
}

/**
 * Main Phase 1 entry point:
 * - Takes raw ontology text + filename
 * - Loads manifest and queries
 * - Runs each query
 * - Returns a flat array of normalized result rows
 */
export async function evaluateAllQueries(ontologyText, fileName = 'ontology.ttl') {
  const store = await loadOntologyIntoStore(ontologyText, fileName);
  const manifest = await loadManifest();

  const allResults = [];

  for (const qMeta of manifest.queries) {
    try {
      const queryText = await loadQueryText(qMeta);
      const rows = await evaluateSingleQuery(store, qMeta, queryText);
      allResults.push(...rows);
    } catch (err) {
      console.error(`Error evaluating query ${qMeta.id}:`, err);
    }
  }

  return allResults;
}
