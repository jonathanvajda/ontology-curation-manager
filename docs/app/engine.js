// app/engine.js
// Phase 1 core: use global N3 and Comunica (from browser bundles)
// Exposes window.OntologyChecks.evaluateAllQueries(text, fileName)

(function () {
  if (!window.N3) {
    console.error('N3 global not found. Make sure n3.min.js is loaded before engine.js.');
  }
  if (!window.Comunica) {
    console.error('Comunica global not found. Make sure comunica-browser.js is loaded before engine.js.');
  }

  const N3 = window.N3 || {};
  const Comunica = window.Comunica || {};

  const Parser = N3.Parser;
  const Store = N3.Store;

  if (!Parser || !Store) {
    console.error('N3.Parser or N3.Store not found on window.N3. Got:', N3);
  }

  // ---- Create a Comunica engine instance, handling multiple bundle shapes ----
  function createComunicaEngine() {
    // Case 1: bundle exposes newEngine() (query-sparql-browser style)
    if (typeof Comunica.newEngine === 'function') {
      console.info('[Comunica] Using Comunica.newEngine()');
      return Comunica.newEngine();
    }

    // Case 2: bundle exposes QueryEngine class
    if (typeof Comunica.QueryEngine === 'function') {
      console.info('[Comunica] Using new Comunica.QueryEngine()');
      return new Comunica.QueryEngine();
    }

    console.error(
      'Could not find a suitable Comunica constructor. ' +
      'Expected Comunica.newEngine() or Comunica.QueryEngine. ' +
      'Found keys:',
      Object.keys(Comunica)
    );
    throw new Error('Unsupported Comunica browser bundle shape');
  }

  let comunicaEngine;
  try {
    comunicaEngine = createComunicaEngine();
  } catch (e) {
    console.error('Failed to create Comunica engine:', e);
  }

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
    if (!Parser || !Store) {
      throw new Error('N3.Parser or N3.Store not available.');
    }
    const format = guessFormatFromFilename(filename);
    const parser = new Parser({ format });
    const store = new Store();
    const quads = parser.parse(text);
    store.addQuads(quads);
    return store;
  }

  // ------- Helpers to consume Comunica bindings streams in multiple shapes -------

  async function collectBindingsStream(stream) {
    // Case A: async iterable (modern Comunica)
    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      const rows = [];
      for await (const binding of stream) {
        rows.push(binding);
      }
      return rows;
    }

    // Case B: Node-style EventEmitter: data/end/error
    if (stream && typeof stream.on === 'function') {
      return await new Promise((resolve, reject) => {
        const rows = [];
        stream.on('data', binding => rows.push(binding));
        stream.on('end', () => resolve(rows));
        stream.on('error', err => reject(err));
      });
    }

    console.error('Unknown bindings stream shape:', stream);
    throw new Error('Unsupported bindings stream type');
  }

  async function runSelect(store, sparql) {
    if (!comunicaEngine) {
      throw new Error('Comunica engine not initialized.');
    }

    let bindingsStream;

    // Prefer queryBindings if present
    if (typeof comunicaEngine.queryBindings === 'function') {
      bindingsStream = await comunicaEngine.queryBindings(sparql, {
        sources: [{ type: 'rdfjsSource', value: store }]
      });
    } else if (typeof comunicaEngine.query === 'function') {
      // Fallback: query() then .bindings()
      const result = await comunicaEngine.query(sparql, {
        sources: [{ type: 'rdfjsSource', value: store }]
      });
      if (typeof result.bindings !== 'function') {
        throw new Error('Comunica query() result has no .bindings() method');
      }
      bindingsStream = await result.bindings();
    } else {
      throw new Error('Comunica engine has neither queryBindings() nor query()');
    }

    const bindings = await collectBindingsStream(bindingsStream);

    const rows = [];
    for (const binding of bindings) {
      const obj = {};
      // binding.entries() for modern Comunica; fallback to .forEach if needed
      if (typeof binding.entries === 'function') {
        for (const [varName, term] of binding.entries()) {
          obj[varName] = term.value;
        }
      } else if (typeof binding.forEach === 'function') {
        binding.forEach((term, varName) => {
          obj[varName] = term.value;
        });
      } else {
        console.warn('Unexpected binding shape:', binding);
      }
      rows.push(obj);
    }
    return rows;
  }

  async function runAsk(store, sparql) {
    if (!comunicaEngine) {
      throw new Error('Comunica engine not initialized.');
    }

    // Prefer queryBoolean if available
    if (typeof comunicaEngine.queryBoolean === 'function') {
      return await comunicaEngine.queryBoolean(sparql, {
        sources: [{ type: 'rdfjsSource', value: store }]
      });
    }

    // Fallback: query() then .booleanResult
    if (typeof comunicaEngine.query === 'function') {
      const result = await comunicaEngine.query(sparql, {
        sources: [{ type: 'rdfjsSource', value: store }]
      });
      if (!result || !result.booleanResult) {
        throw new Error('Comunica query() result has no booleanResult for ASK query');
      }
      return await result.booleanResult;
    }

    throw new Error('Comunica engine has neither queryBoolean() nor query()');
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

    // Use getQuads for maximum compatibility across N3 versions
    const quads = store.getQuads(null, null, null, null);
    for (const quad of quads) {
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

      // Determine which variable in the row is the "resource"
      const resourceVar = qMeta.resourceVar || 'resource';

      function extractResource(row) {
        // 1) If manifest said "this var is the resource", prefer that
        if (row[resourceVar]) return row[resourceVar];
        // 2) Fall back to ?resource if present
        if (row.resource) return row.resource;
        // 3) Otherwise, fall back to the first bound variable value
        const vals = Object.values(row);
        return vals.length > 0 ? vals[0] : null;
      }

      const records = rows.map(row => ({
        resource: extractResource(row),
        queryId: qMeta.id,
        requirementId,
        status: qMeta.polarity === 'matchMeansFail' ? 'fail' : 'fail', // can extend later
        severity,
        scope,
        details: row
      }));

      return records;
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

    // Collect candidate resources: all subjects with rdfs:label
    const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
    const labeled = new Set();
    const quads = store.getQuads(null, RDFS_LABEL, null, null);
    for (const q of quads) {
      labeled.add(q.subject.value);
    }

    return {
      results: allResults,
      resources: Array.from(labeled)
    };
  }

  // Expose as a global for the page script
  window.OntologyChecks = {
    evaluateAllQueries
  };
})();
