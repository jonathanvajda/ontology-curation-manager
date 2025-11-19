// app/engine.js
// Phase 1 core: use global N3 and Comunica (from browser bundles)
// Exposes window.OntologyChecks.evaluateAllQueries(text, fileName)

(function () {
  if (!window.N3) {
    console.error('N3 global not found. Make sure n3.min.js is loaded before engine.js.');
    return;
  }
  if (!window.Comunica) {
    console.error('Comunica global not found. Make sure comunica-browser.js is loaded before engine.js.');
    return;
  }

  const { Parser, Store } = window.N3;
  const { newEngine } = window.Comunica;

  const comunicaEngine = newEngine();

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

  async function loadOntologyIntoStore(text, filename) {
    const format = guessFormatFromFilename(filename);
    const parser = new Parser({ format });
    const store = new Store();
    const quads = parser.parse(text);
    store.addQuads(quads);
    return store;
  }

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

  async function runAsk(store, sparql) {
    const result = await comunicaEngine.queryBoolean(sparql, {
      sources: [{ type: 'rdfjsSource', value: store }]
    });
    return result;
  }

  async function loadManifest(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch manifest: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async function loadQueryText(queryMeta, basePath) {
    const url = basePath + queryMeta.file;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch query ${queryMeta.id} from ${url}`);
    }
    return res.text();
  }

  function guessOntologyIri(store) {
    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const OWL_ONTOLOGY = 'http://www.w3.org/2002/07/owl#Ontology';

    const it = store.match(null, null, null);
    let quad;
    while ((quad = it.next()).value) {
      if (quad.predicate.value === RDF_TYPE && quad.object.value === OWL_ONTOLOGY) {
        return quad.subject.value;
      }
    }
    return 'urn:ontology:unknown';
  }

  async function evaluateSingleQuery(store, qMeta, queryText) {
    const requirementId = qMeta.checksConformityTo || null;
    const severity = qMeta.severity || 'info';
    const scope = qMeta.scope || 'resource';

    if (qMeta.kind === 'SELECT') {
      const rows = await runSelect(store, queryText);

      if (qMeta.polarity === 'matchMeansFail') {
        return rows.map(row => ({
          resource: row.resource || null,
          queryId: qMeta.id,
          requirementId,
          status: 'fail',
          severity,
          scope,
          details: row
        }));
      }

      return rows.map(row => ({
        resource: row.resource || null,
        queryId: qMeta.id,
        requirementId,
        status: 'fail',
        severity,
        scope,
        details: row
      }));
    }

    if (qMeta.kind === 'ASK') {
      const ok = await runAsk(store, queryText);
      let status;

      if (qMeta.polarity === 'trueMeansPass') {
        status = ok ? 'pass' : 'fail';
      } else if (qMeta.polarity === 'trueMeansFail') {
        status = ok ? 'fail' : 'pass';
      } else {
        status = ok ? 'pass' : 'fail';
      }

      const ontologyIri = guessOntologyIri(store);

      return [
        {
          resource: ontologyIri,
          queryId: qMeta.id,
          requirementId,
          status,
          severity,
          scope,
          details: { askResult: ok }
        }
      ];
    }

    console.warn(`Unknown query kind for ${qMeta.id}:`, qMeta.kind);
    return [];
  }

  async function evaluateAllQueries(ontologyText, fileName) {
    const store = await loadOntologyIntoStore(ontologyText, fileName || 'ontology.ttl');
    const manifest = await loadManifest('queries/manifest.json');

    const allResults = [];

    for (const qMeta of manifest.queries) {
      try {
        const queryText = await loadQueryText(qMeta, 'queries/');
        const rows = await evaluateSingleQuery(store, qMeta, queryText);
        allResults.push(...rows);
      } catch (err) {
        console.error(`Error evaluating query ${qMeta.id}:`, err);
      }
    }

    return allResults;
  }

  // Expose as a global for the page script
  window.OntologyChecks = {
    evaluateAllQueries
  };
})();