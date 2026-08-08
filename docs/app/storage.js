// @ts-check

/**
 * Project-portfolio persistence for OCD saved diagnostic runs.
 *
 * The app-facing API intentionally preserves the existing `saveRun/listRuns`
 * names while routing storage through the shared IndexedDB data-management
 * package. Stored payloads retain the legacy shape consumed by the current UI.
 */

import {
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  createProjectPortfolioStores,
  ensureProjectPortfolioProject,
  openProjectPortfolioDatabase
} from './shared/indexeddb-data-management/index.js';
import { createUuid } from './shared/ontology-utils/index.js';

/** @typedef {import('./types.js').RunKind} RunKind */
/** @typedef {import('./types.js').SaveRunInput} SaveRunInput */
/** @typedef {import('./types.js').SavedRun} SavedRun */

export const DB_NAME = 'OntologyWorkbenchProjects';
export const DB_VERSION = 1;

export const STORE_NAMES = Object.freeze({
  runs: 'runs',
  appState: 'settings'
});

const OCD_PROJECT_ID = DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID;
const OCD_APP_ID = 'ontology-curation-manager';
const LAST_RUN_SETTING_KEY = 'ocd.lastRunId';
const THEME_SETTING_KEY = 'theme';

let portfolioPromise = null;

/**
 * Returns the current timestamp in ISO 8601 format.
 *
 * @returns {string}
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Creates a reasonably unique id for a persisted run.
 *
 * @param {RunKind} prefix
 * @returns {string}
 */
function makeRunId(prefix) {
  return `${prefix}_${createUuid()}`;
}

/**
 * Validates the run kind.
 *
 * @param {unknown} value
 * @returns {asserts value is RunKind}
 */
function assertRunKind(value) {
  if (value !== 'single' && value !== 'batch') {
    throw new TypeError(`Invalid run kind: ${String(value)}`);
  }
}

/**
 * Opens shared project portfolio stores used by OCD.
 *
 * @returns {Promise<ReturnType<typeof createProjectPortfolioStores>>}
 */
async function openOcdStores() {
  if (!portfolioPromise) {
    portfolioPromise = openProjectPortfolioDatabase().then(async (db) => {
      const stores = createProjectPortfolioStores(db);
      await ensureProjectPortfolioProject(stores, {
        projectId: OCD_PROJECT_ID,
        label: 'Default Project',
        storageBackend: 'indexeddb'
      });
      return stores;
    });
  }
  return portfolioPromise;
}

/**
 * Opens shared OCD project portfolio stores for feature modules that need
 * artifact/run/settings access without creating app-local IndexedDB schemas.
 *
 * @returns {Promise<ReturnType<typeof createProjectPortfolioStores>>}
 */
export function openOcdProjectStores() {
  return openOcdStores();
}

/**
 * Saves a run and updates the "last" pointer.
 *
 * @param {SaveRunInput} input
 * @returns {Promise<string>}
 */
export async function saveRun(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('saveRun() requires an input object.');
  }

  const { kind, label = '', payload, uiState = null } = input;
  assertRunKind(kind);

  if (payload == null) {
    throw new TypeError('saveRun() requires a payload.');
  }

  /** @type {SavedRun} */
  const run = {
    id: makeRunId(kind),
    kind,
    label: String(label || ''),
    createdAt: nowIso(),
    payload,
    uiState
  };

  const stores = await openOcdStores();
  await stores.runs.storeRunRecord({
    runId: run.id,
    projectId: OCD_PROJECT_ID,
    runKind: `diagnostic-${kind}`,
    label: run.label || `Diagnostic ${kind}`,
    createdAt: run.createdAt,
    payload: { ...run, appId: OCD_APP_ID },
    uiState,
    inputArtifactIds: [],
    outputArtifactIds: []
  });

  await stores.settings.writeSettingValue(LAST_RUN_SETTING_KEY, run.id);

  return run.id;
}

/**
 * Lists saved runs in descending createdAt order.
 *
 * @param {number} [limit=50]
 * @returns {Promise<SavedRun[]>}
 */
export async function listRuns(limit = 50) {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const stores = await openOcdStores();
  const records = await stores.runs.listRunRecords({ projectId: OCD_PROJECT_ID });
  return records
    .filter((record) => String(record.runKind || '').startsWith('diagnostic-'))
    .map((record) => /** @type {SavedRun} */ (record.payload))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, normalizedLimit);
}

/**
 * Retrieves a saved run by id.
 *
 * @param {string} runId
 * @returns {Promise<SavedRun | null>}
 */
export async function getRun(runId) {
  if (!runId) {
    return null;
  }

  const stores = await openOcdStores();
  const record = await stores.runs.getRunRecord(runId);
  return record?.payload || null;
}

/**
 * Deletes a saved run. If the deleted run is the current "last" pointer,
 * the pointer is removed as well.
 *
 * @param {string} runId
 * @returns {Promise<boolean>}
 */
export async function deleteRun(runId) {
  if (!runId) {
    return false;
  }

  const stores = await openOcdStores();
  if ((await getLastRunId()) === runId) {
    await stores.settings.deleteSettingRecord(LAST_RUN_SETTING_KEY);
  }
  await stores.runs.deleteRunRecord(runId);
  return true;
}

/**
 * Returns the saved run id stored in the "last" pointer, if any.
 *
 * @returns {Promise<string | null>}
 */
export async function getLastRunId() {
  const stores = await openOcdStores();
  return stores.settings.readSettingValue(LAST_RUN_SETTING_KEY, null);
}

/**
 * Persists one OCD project-scoped setting value in the shared portfolio DB.
 *
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<unknown>}
 */
export async function writeProjectSettingValue(key, value) {
  const stores = await openOcdStores();
  await stores.settings.writeSettingValue(key, value);
  return value;
}

/**
 * Reads one OCD project-scoped setting value from the shared portfolio DB.
 *
 * @template T
 * @param {string} key
 * @param {T} fallbackValue
 * @returns {Promise<T | unknown>}
 */
export async function readProjectSettingValue(key, fallbackValue = null) {
  const stores = await openOcdStores();
  return stores.settings.readSettingValue(key, fallbackValue);
}

/**
 * Persists the OCD theme as an app/user setting.
 *
 * @param {'ocd-theme-light' | 'ocd-theme-dark'} themeClass
 * @returns {Promise<'ocd-theme-light' | 'ocd-theme-dark'>}
 */
export async function writeThemePreference(themeClass) {
  const stores = await openOcdStores();
  await stores.settings.writeSettingValue(THEME_SETTING_KEY, themeClass);
  return themeClass;
}

/**
 * Reads the persisted OCD theme preference.
 *
 * @returns {Promise<'ocd-theme-light' | 'ocd-theme-dark' | null>}
 */
export async function readThemePreference() {
  const stores = await openOcdStores();
  const value = await stores.settings.readSettingValue(THEME_SETTING_KEY, null);
  return value === 'ocd-theme-dark' || value === 'ocd-theme-light' ? value : null;
}
