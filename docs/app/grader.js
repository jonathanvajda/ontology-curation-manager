// app/grader.js
// Phase 2: compute per-resource curation status from normalized results + manifest
// Extends window.OntologyChecks with computePerResourceCuration()

(function () {
  const IAO = {
    UNCURATED: 'http://purl.obolibrary.org/obo/IAO_0000124',
    METADATA_INCOMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000123',
    METADATA_COMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000120',
    PENDING_FINAL_VETTING: 'http://purl.obolibrary.org/obo/IAO_0000125',

    // Project-specific extensions for later
    REQUIRES_DISCUSSION: 'http://example.org/curation-status/requires-discussion',
    READY_FOR_RELEASE: 'http://example.org/curation-status/ready-for-release'
  };

  const IAO_LABELS = {
    [IAO.UNCURATED]: 'uncurated',
    [IAO.METADATA_INCOMPLETE]: 'metadata incomplete',
    [IAO.METADATA_COMPLETE]: 'metadata complete',
    [IAO.PENDING_FINAL_VETTING]: 'pending final vetting',
    [IAO.REQUIRES_DISCUSSION]: 'requires discussion',
    [IAO.READY_FOR_RELEASE]: 'ready for release'
  };

  /**
   * Status policy v2 (driven only by failures we can see now):
   *
   * Let:
   *  - hasReqFail = any required requirement failed
   *  - hasRecFail = any recommendation failed
   *
   * For now:
   *  - hasReqFail -> metadata incomplete
   *  - !hasReqFail && hasRecFail -> metadata complete
   *  - !hasReqFail && !hasRecFail -> pending final vetting
   *
   * "uncurated" will be reserved for a future heuristic:
   *  - e.g., a dedicated query that flags "IRI + label only" resources,
   *    or a resource that lacks hits from *any* requirement checks.
   *
   * "requires discussion" and "ready for release" will be assigned
   * manually or via future higher-level signals.
   */
  function statusPolicy(hasReqFail, hasRecFail, flags = {}) {
    // Placeholder hook for future:
    if (flags.uncurated) return IAO.UNCURATED;

    if (hasReqFail) return IAO.METADATA_INCOMPLETE;
    if (!hasReqFail && hasRecFail) return IAO.METADATA_COMPLETE;
    // All requirements + all recommendations met (as far as we know)
    return IAO.PENDING_FINAL_VETTING;

    // Later you might do:
    // if (flags.requiresDiscussion) return IAO.REQUIRES_DISCUSSION;
    // if (flags.readyForRelease) return IAO.READY_FOR_RELEASE;
  }

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

      let type = 'requirement';
      if (requirementId && reqType.has(requirementId)) {
        type = reqType.get(requirementId);
      }

      let entry = per.get(resource);
      if (!entry) {
        entry = {
          resource,
          failedRequirements: new Set(),
          failedRecommendations: new Set()
          // future: flags: { uncurated: false, requiresDiscussion: false, readyForRelease: false }
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

      // FUTURE: detect resource-level flags from special queries:
      // e.g. if (row.queryId === 'q_onlyLabel') entry.flags.uncurated = true;
    }

    const out = [];
    for (const entry of per.values()) {
      const hasReqFail = entry.failedRequirements.size > 0;
      const hasRecFail = entry.failedRecommendations.size > 0;

      const statusIri = statusPolicy(hasReqFail, hasRecFail, entry.flags || {});
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

  window.OntologyChecks = window.OntologyChecks || {};
  window.OntologyChecks.computePerResourceCuration = computePerResourceCuration;
})();
