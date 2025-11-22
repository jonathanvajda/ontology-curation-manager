// app/grader.js (ES module)

const IAO = {
  UNCURATED: 'http://purl.obolibrary.org/obo/IAO_0000124',
  METADATA_INCOMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000123',
  METADATA_COMPLETE: 'http://purl.obolibrary.org/obo/IAO_0000120',
  PENDING_FINAL_VETTING: 'http://purl.obolibrary.org/obo/IAO_0000125',
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

function statusPolicy(hasReqFail, hasRecFail, flags = {}) {
  if (flags.uncurated) return IAO.UNCURATED;
  if (hasReqFail) return IAO.METADATA_INCOMPLETE;
  if (!hasReqFail && hasRecFail) return IAO.METADATA_COMPLETE;
  return IAO.PENDING_FINAL_VETTING;
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

export function computePerResourceCuration(results, manifest, allResources) {
  const reqType = buildRequirementTypeMap(manifest);
  const per = new Map();
  const rows = Array.isArray(results) ? results : [];

  for (const row of rows) {
    const resource = row.resource || 'urn:resource:unknown';
    const requirementId = row.requirementId || null;
    const status = row.status || 'fail';
    const queryId = row.queryId || null;

    let type = 'requirement';
    if (requirementId && reqType.has(requirementId)) {
      type = reqType.get(requirementId);
    }

    let entry = per.get(resource);
    if (!entry) {
      entry = {
        resource,
        failedRequirements: new Set(),
        failedRecommendations: new Set(),
        flags: {
          uncurated: false,
          requiresDiscussion: false,
          readyForRelease: false
        }
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

    if (status === 'fail' && queryId === 'q_onlyLabel') {
      entry.flags.uncurated = true;
    }
  }

  if (Array.isArray(allResources)) {
    for (const iri of allResources) {
      if (!per.has(iri)) {
        per.set(iri, {
          resource: iri,
          failedRequirements: new Set(),
          failedRecommendations: new Set(),
          flags: {
            uncurated: false,
            requiresDiscussion: false,
            readyForRelease: false
          }
        });
      }
    }
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

export function computeOntologyReport(results, manifest, ontologyIri) {
  const reqType = buildRequirementTypeMap(manifest);
  const requirements = new Map();

  if (manifest && Array.isArray(manifest.requirements)) {
    for (const r of manifest.requirements) {
      requirements.set(r.id, {
        id: r.id,
        type: r.type === 'recommendation' ? 'recommendation' : 'requirement',
        weight: typeof r.weight === 'number' ? r.weight : 1,
        failedResourcesCount: 0,
        failingResources: new Set(),
        hasFail: false
      });
    }
  }

  const rows = Array.isArray(results) ? results : [];
  for (const row of rows) {
    const requirementId = row.requirementId || null;
    const status = row.status || 'fail';
    const scope = row.scope || 'resource';
    const resource = row.resource || null;

    if (!requirementId || !requirements.has(requirementId)) continue;

    const entry = requirements.get(requirementId);
    if (status === 'fail') {
      entry.hasFail = true;
      if (scope === 'resource' && resource) {
        entry.failingResources.add(resource);
      }
    }
  }

  let hasReqFail = false;
  let hasRecFail = false;
  const requirementList = [];

  for (const entry of requirements.values()) {
    const failedCount = entry.failingResources.size;
    entry.failedResourcesCount = failedCount;
    const status = entry.hasFail ? 'fail' : 'pass';
    entry.status = status;

    if (entry.type === 'requirement' && entry.hasFail) hasReqFail = true;
    if (entry.type === 'recommendation' && entry.hasFail) hasRecFail = true;

    requirementList.push({
      id: entry.id,
      type: entry.type,
      weight: entry.weight,
      status,
      failedResourcesCount: failedCount,
      failingResources: Array.from(entry.failingResources)
    });
  }

  const flags = {};
  const statusIri = statusPolicy(hasReqFail, hasRecFail, flags);
  const statusLabel = IAO_LABELS[statusIri] || 'unknown';

  return {
    ontologyIri: ontologyIri || 'urn:ontology:unknown',
    statusIri,
    statusLabel,
    requirements: requirementList
  };
}
