// app/nlp-qa-storage.js
// @ts-check

import { openOcdProjectStores } from './storage.js';
import { createUuid } from './shared/ontology-utils/index.js';
import { COMMON_NAMESPACE_IRIS } from './shared/namespace-registry/index.js';
import { getMimeTypeForFormatKey } from './shared/format-registry/index.js';
import {
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  PROJECT_RECORD_JSONLD_CONTEXT,
  createProjectFolderManifest,
  createProjectFolderStore,
  storeProjectArtifactData,
  storeProjectRunData,
  writeProjectArtifactToFolder,
  writeProjectManifestToFolder
} from './shared/indexeddb-data-management/index.js';

export const NLP_QA_LAST_STATE_KEY = 'ocd.nlpQa.lastState';
export const NLP_QA_LAST_RUN_KEY = 'ocd.nlpQa.lastRunId';
export const NLP_QA_RUN_KIND = 'nlp-quality-assurance';
export const NLP_QA_REPORT_ARTIFACT_KIND = 'diagnostic-report';
export const NLP_QA_APP_ID = 'ontology-curation-manager';
const NLP_QA_REPORT_FORMAT_KEY = 'jsonLd';

/**
 * @typedef {import('./nlp-qa-ontology.js').NlpQaOntologyRow} NlpQaOntologyRow
 * @typedef {import('./nlp-qa-model.js').NlpQaIssue} NlpQaIssue
 * @typedef {import('./nlp-qa-model.js').NlpQaCheckModes} NlpQaCheckModes
 *
 * @typedef {Object} NlpQaStatePayload
 * @property {string} [fileName]
 * @property {NlpQaOntologyRow[]} [rows]
 * @property {'all'|'spelling'|'grammar'|'clean'|'modified'} [filter]
 * @property {Partial<NlpQaCheckModes>} [scratchCheckModes]
 * @property {Partial<NlpQaCheckModes>} [ontologyCheckModes]
 * @property {{ text?: string, status?: string, issues?: NlpQaIssue[], checkModes?: Partial<NlpQaCheckModes> }} [scratch]
 *
 * @typedef {Object} PersistedNlpQaRun
 * @property {object} run
 * @property {object} artifact
 * @property {object} state
 */

function nowIso() {
  return new Date().toISOString();
}

function dateTimeLiteral(value) {
  return { '@value': value, '@type': COMMON_NAMESPACE_IRIS.xsd.dateTime };
}

function stringLiteral(value) {
  return { '@value': String(value ?? ''), '@type': COMMON_NAMESPACE_IRIS.xsd.string };
}

function booleanLiteral(value) {
  return { '@value': !!value, '@type': COMMON_NAMESPACE_IRIS.xsd.boolean };
}

function createStateIri(id = `urn:uuid:${createUuid()}`) {
  return id;
}

/**
 * Converts one in-memory NLP QA row to a JSON-LD node keyed by ontology terms.
 *
 * @param {NlpQaOntologyRow} row
 * @param {string} updatedAt
 * @returns {object}
 */
export function convertNlpQaOntologyRowToJsonLd(row, updatedAt = nowIso()) {
  const record = {
    '@id': row.iri,
    [COMMON_NAMESPACE_IRIS.rdf.type]: row.type ? { '@id': row.type } : undefined,
    [COMMON_NAMESPACE_IRIS.rdfs.label]: row.label ? stringLiteral(row.label) : undefined,
    [COMMON_NAMESPACE_IRIS.skos.prefLabel]: row.prefLabel ? stringLiteral(row.prefLabel) : undefined,
    [COMMON_NAMESPACE_IRIS.skos.definition]: row.definition ? stringLiteral(row.definition) : undefined,
    [COMMON_NAMESPACE_IRIS.skos.example]: row.example ? stringLiteral(row.example) : undefined,
    [COMMON_NAMESPACE_IRIS.skos.scopeNote]: row.scopeNote ? stringLiteral(row.scopeNote) : undefined,
    [COMMON_NAMESPACE_IRIS.cco2.acronym]: row.acronym ? stringLiteral(row.acronym) : undefined
  };
  if (row.modified) {
    record[COMMON_NAMESPACE_IRIS.dcterms.modified] = dateTimeLiteral(updatedAt);
  }
  return stripUndefined(record);
}

/**
 * Converts a JSON-LD NLP QA row back to the page's in-memory row shape.
 *
 * @param {object} row
 * @returns {NlpQaOntologyRow}
 */
export function convertJsonLdToNlpQaOntologyRow(row) {
  return {
    iri: String(row?.['@id'] || ''),
    type: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.rdf.type),
    label: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.rdfs.label),
    prefLabel: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.skos.prefLabel),
    definition: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.skos.definition),
    example: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.skos.example),
    scopeNote: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.skos.scopeNote),
    acronym: readJsonLdValue(row, COMMON_NAMESPACE_IRIS.cco2.acronym),
    modified: !!row?.[COMMON_NAMESPACE_IRIS.dcterms.modified]
  };
}

/**
 * Creates a JSON-LD NLP QA state document whose durable keys come from the
 * shared namespace registry. Compact CURIEs are intentionally not used here.
 *
 * @param {NlpQaStatePayload} payload
 * @param {object} [options]
 * @param {string} [options.stateId]
 * @param {string} [options.updatedAt]
 * @returns {object}
 */
export function createNlpQaStateJsonLd(payload = {}, { stateId, updatedAt = nowIso() } = {}) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const id = createStateIri(stateId);
  return stripUndefined({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': id,
    '@type': COMMON_NAMESPACE_IRIS.okea.Setting,
    [COMMON_NAMESPACE_IRIS.dcterms.identifier]: stringLiteral(id),
    [COMMON_NAMESPACE_IRIS.dcterms.modified]: dateTimeLiteral(updatedAt),
    [COMMON_NAMESPACE_IRIS.okea.appId]: NLP_QA_APP_ID,
    [COMMON_NAMESPACE_IRIS.okea.settingKey]: NLP_QA_LAST_STATE_KEY,
    [COMMON_NAMESPACE_IRIS.okea.fileName]: payload.fileName ? stringLiteral(payload.fileName) : undefined,
    [COMMON_NAMESPACE_IRIS.okea.uiState]: createNlpQaUiStateJsonLd(payload),
    [COMMON_NAMESPACE_IRIS.rdf.value]: rows.map((row) => convertNlpQaOntologyRowToJsonLd(row, updatedAt))
  });
}

/**
 * Reads the page's in-memory state payload from a JSON-LD state object.
 *
 * @param {object|null} state
 * @returns {NlpQaStatePayload|null}
 */
export function readNlpQaStatePayloadFromJsonLd(state) {
  if (!state || typeof state !== 'object') return null;
  const uiState = state[COMMON_NAMESPACE_IRIS.okea.uiState] || {};
  const rows = Array.isArray(state[COMMON_NAMESPACE_IRIS.rdf.value])
    ? state[COMMON_NAMESPACE_IRIS.rdf.value].map(convertJsonLdToNlpQaOntologyRow)
    : [];
  return {
    fileName: readJsonLdValue(state, COMMON_NAMESPACE_IRIS.okea.fileName),
    rows,
    filter: readSettingValue(uiState, 'filter') || 'all',
    scratchCheckModes: readSettingValue(uiState, 'scratchCheckModes') || undefined,
    ontologyCheckModes: readSettingValue(uiState, 'ontologyCheckModes') || undefined,
    scratch: readSettingValue(uiState, 'scratch') || undefined
  };
}

/**
 * Saves latest NLP QA state as a project-scoped IndexedDB setting.
 *
 * @param {NlpQaStatePayload} payload
 * @returns {Promise<object>}
 */
export async function saveLatestNlpQaStateToIndexedDb(payload) {
  const state = createNlpQaStateJsonLd(payload);
  const stores = await openOcdProjectStores();
  await stores.settings.writeSettingValue(NLP_QA_LAST_STATE_KEY, state);
  return state;
}

/**
 * Loads latest NLP QA state from the shared project portfolio DB.
 *
 * @returns {Promise<NlpQaStatePayload|null>}
 */
export async function loadLatestNlpQaStateFromIndexedDb() {
  const stores = await openOcdProjectStores();
  const state = await stores.settings.readSettingValue(NLP_QA_LAST_STATE_KEY, null);
  return readNlpQaStatePayloadFromJsonLd(/** @type {object|null} */ (state));
}

/**
 * Stores an explicit NLP QA run and output report artifact in IndexedDB.
 *
 * @param {NlpQaStatePayload} payload
 * @param {object} [options]
 * @param {string} [options.label]
 * @param {string} [options.createdAt]
 * @returns {Promise<PersistedNlpQaRun>}
 */
export async function saveNlpQaRunToIndexedDb(payload, { label, createdAt = nowIso() } = {}) {
  const stores = await openOcdProjectStores();
  const state = createNlpQaStateJsonLd(payload, { updatedAt: createdAt });
  const title = label || `NLP QA${payload.fileName ? ` - ${payload.fileName}` : ''}`;
  const reportFormat = getReportArtifactFormat();
  const artifact = await storeProjectArtifactData(stores, {
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    artifactKind: NLP_QA_REPORT_ARTIFACT_KIND,
    role: 'report',
    label: title,
    mediaType: reportFormat.mimeType,
    extension: reportFormat.extensions[0],
    createdAt,
    updatedAt: createdAt,
    source: payload.fileName ? { [COMMON_NAMESPACE_IRIS.okea.fileName]: payload.fileName } : {},
    summary: createNlpQaRunSummary(payload)
  }, state);
  const run = await storeProjectRunData(stores, {
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    runKind: NLP_QA_RUN_KIND,
    label: title,
    createdAt,
    updatedAt: createdAt,
    outputArtifactIds: [artifact.artifactId],
    payload: state,
    uiState: state,
    metadata: { [COMMON_NAMESPACE_IRIS.okea.appId]: NLP_QA_APP_ID }
  });
  await stores.settings.writeSettingValue(NLP_QA_LAST_RUN_KEY, run.runId);
  return { run, artifact, state };
}

/**
 * Writes the latest NLP QA run artifact to a File System Access project folder.
 *
 * @param {FileSystemDirectoryHandle} folderHandle
 * @param {PersistedNlpQaRun} savedRun
 * @returns {Promise<object>}
 */
export async function writeNlpQaRunToProjectFolder(folderHandle, savedRun) {
  const stores = await openOcdProjectStores();
  const folderStore = await createProjectFolderStore(folderHandle).initialize();
  const written = await writeProjectArtifactToFolder(folderStore, {
    ...savedRun.artifact,
    payload: savedRun.state
  }, savedRun.state);
  const project = await stores.projects.getProject(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  const artifacts = await stores.artifacts.listProjectArtifacts(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID, { includePayload: false });
  const runs = await stores.runs.listRunRecords({ projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID });
  const manifest = createProjectFolderManifest({
    project,
    artifacts,
    runs
  }, {
    appId: NLP_QA_APP_ID,
    packageName: 'ontology-compliance-diagnostic'
  });
  await writeProjectManifestToFolder(folderStore, manifest);
  return written;
}

function createNlpQaUiStateJsonLd(payload) {
  return {
    [COMMON_NAMESPACE_IRIS.okea.settingKey]: 'nlp-quality-assurance-ui-state',
    [COMMON_NAMESPACE_IRIS.rdf.value]: [
      createSettingValue('filter', payload.filter || 'all'),
      createSettingValue('scratchCheckModes', payload.scratchCheckModes || {}),
      createSettingValue('ontologyCheckModes', payload.ontologyCheckModes || {}),
      createSettingValue('scratch', payload.scratch || {})
    ]
  };
}

function createSettingValue(key, value) {
  return {
    '@type': COMMON_NAMESPACE_IRIS.okea.Setting,
    [COMMON_NAMESPACE_IRIS.okea.settingKey]: key,
    [COMMON_NAMESPACE_IRIS.rdf.value]: value
  };
}

function readSettingValue(uiState, key) {
  const settings = Array.isArray(uiState?.[COMMON_NAMESPACE_IRIS.rdf.value])
    ? uiState[COMMON_NAMESPACE_IRIS.rdf.value]
    : [];
  const setting = settings.find((candidate) => candidate?.[COMMON_NAMESPACE_IRIS.okea.settingKey] === key);
  return setting ? setting[COMMON_NAMESPACE_IRIS.rdf.value] : undefined;
}

function readJsonLdValue(record, key) {
  const value = record?.[key];
  if (Array.isArray(value)) return value.map(readJsonLdScalar).filter(Boolean).join('; ');
  return readJsonLdScalar(value);
}

function readJsonLdScalar(value) {
  if (value == null) return '';
  if (typeof value === 'object' && '@value' in value) return String(value['@value'] ?? '');
  if (typeof value === 'object' && '@id' in value) return String(value['@id'] ?? '');
  return String(value ?? '');
}

function createNlpQaRunSummary(payload) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return {
    [COMMON_NAMESPACE_IRIS.okea.documentCount]: rows.length,
    [COMMON_NAMESPACE_IRIS.okea.enabled]: booleanLiteral(true)
  };
}

function getReportArtifactFormat() {
  const result = getMimeTypeForFormatKey(NLP_QA_REPORT_FORMAT_KEY);
  if (!result.ok) {
    throw new Error(`Format registry is missing ${NLP_QA_REPORT_FORMAT_KEY}.`);
  }
  return result.value;
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
