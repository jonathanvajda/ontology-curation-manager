// app/grader.js
// Phase 2: compute per-resource curation status from normalized results + manifest
// Extends window.OntologyChecks with computePerResourceCuration()

(function () {
  const IAO = {
    UNCURATED: 'http://purl.obolibrary.org/obo/IAO_0000124',
    METADATA_INCOMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000123',
    METADATA_COMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000120',
    PENDING_FINAL_VETTING: 'http://purl.obolibrary.org/obo/IAO_0000125'
  };

  const IAO_LABELS = {
    [IAO.UNCURATED]: 'uncurated',
    [IAO.METADATA_INCOMPLETE]: 'metadata incomplete',
    [IAO.METADATA_COMPLETE]: 'metadata complete',
    [IAO.PENDING_FINAL_VETTING]: 'pending final vetting'
  };

  /**
   * Simple policy v1:
   * - If any requirement fails -> metadata incomplete
   * - Else if any recommendation fails -> metadata incomplete
   * - Else -> metadata complete
   *
   * (UNCURATED / PENDING_FINAL_VETTING reserved for later refinements.)
   */
  function statusPolicy(hasReqFail, hasRecFail) {
    if (hasReqFail) return IAO.METADATA_INCOMPLETE;
    if (!hasReqFail && hasRecFail) return IAO.METADATA_INCOMPLETE;
    return IAO.METADATA_COMPLETE;
  }

  /**
   * Build a map requirementId -> "requirement" | "recommendation"
   */
  function buildRequirementTypeMap(manifest) {
    const map = new Map();
    if (manifest && Array.isArray(manifest.requirements)) {
      for (const r of manifest.requirements) {
        if (!r || !r.id) continue;
        const type = r.type === 'recommendation' ? 'recommendation' : 'requirement';
        map.set(r.id, type);
      }
    }
    return map;
  }

  /**
   * Compute per-resource curation status from normalized results.
   *
   * @param {Array<Object>} results - normalized rows from evaluateAllQueries
   * @param {Object} manifest - manifest.json object
   * @returns {Array<Object>} rows:
   *   {
   *     resource,
   *     statusIri,
   *     statusLabel,
   *     failedRequirements: string[],
   *     failedRecommendations: string[]
   *   }
   */
  function computePerResourceCuration(results, manifest) {
    const reqType = buildRequirementTypeMap(manifest);
    const per = new Map();

    for (const row of results || []) {
      const resource = row.resource || 'urn:resource:unknown';
      const requirementId = row.requirementId || null;
      const status = row.status || 'fail';

      let type = 'requirement'; // default if manifest doesn't specify
      if (requirementId && reqType.has(requirementId)) {
        type = reqType.get(requirementId);
      }

      let entry = per.get(resource);
      if (!entry) {
        entry = {
          resource,
          failedRequirements: new Set(),
          failedRecommendations: new Set()
        };
        per.set(resource, entry);
      }

      if (status === 'fail' && requirementId) {
        if (type === 'requirement') {
          entry.failedRequirements.add(requirementId);
        } else if (type === 'recommendation') {
          entry.failedRecommendations.add(requirementId);
        }
      }
    }

    // Compute status for each resource
    const out = [];
    for (const entry of per.values()) {
      const hasReqFail = entry.failedRequirements.size > 0;
      const hasRecFail = entry.failedRecommendations.size > 0;

      const statusIri = statusPolicy(hasReqFail, hasRecFail);
      const statusLabel = IAO_LABELS[statusIri] || 'unknown';

      out.push({
        resource: entry.resource,
        statusIri,
        statusLabel,
        failedRequirements: Array.from(entry.failedRequirements),
        failedRecommendations: Array.from(entry.failedRecommendations)
      });
    }

    return out;
  }

  // Attach to global object
  window.OntologyChecks = window.OntologyChecks || {};
  window.OntologyChecks.computePerResourceCuration = computePerResourceCuration;
})();
