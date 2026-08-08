// app/nlp-qa-main.js
// @ts-check

import { parseOntologyInput, serializeOntologyStore } from './engine.js';
import { downloadTextFile } from './shared/browser-file-io/index.js';
import { getTimestampForFileName, safeFilePart } from './shared.js';
import { checkTextFieldWithNlpQa, DEFAULT_NLP_QA_CHECK_MODES, normalizeNlpQaCheckModes } from './nlp-qa-model.js';
import {
  buildNlpQaOntologyLexicon,
  checkNlpQaOntologyTable,
  DEFAULT_NLP_QA_ONTOLOGY_CHECK_MODES,
  extractNlpQaOntologyRowsFromRdfStore,
  updateNlpQaOntologyRowsWithEditedField
} from './nlp-qa-ontology.js';
import { loadLatestNlpQaStateFromIndexedDb, saveLatestNlpQaStateToIndexedDb } from './nlp-qa-storage.js';
import { renderNlpQaOntologyTable, renderNlpQaScratchChecker } from './render-nlp-qa.js';

/** @typedef {import('./nlp-qa-ontology.js').NlpQaOntologyRow} NlpQaOntologyRow */
/** @typedef {import('./nlp-qa-ontology.js').NlpQaCheckedOntologyRow} NlpQaCheckedOntologyRow */
/** @typedef {import('./nlp-qa-model.js').NlpQaIssue} NlpQaIssue */
/** @typedef {import('./nlp-qa-model.js').NlpQaCheckModes} NlpQaCheckModes */
/** @typedef {Awaited<ReturnType<typeof parseOntologyInput>>} ParsedOntology */

/** @type {HTMLInputElement | null} */
const filesInput = /** @type {HTMLInputElement | null} */ (document.getElementById('ontologyFiles'));
/** @type {HTMLButtonElement | null} */
const loadButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('loadFilesForNlpQaBtn'));
/** @type {HTMLButtonElement | null} */
const restoreButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('restoreNlpQaStateBtn'));
/** @type {HTMLButtonElement | null} */
const exportButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('exportNlpQaTurtleBtn'));
/** @type {HTMLElement | null} */
const statusElement = document.getElementById('status');
/** @type {HTMLElement | null} */
const scratchContainer = document.getElementById('nlpQaScratchContainer');
/** @type {HTMLElement | null} */
const tableContainer = document.getElementById('nlpQaTableContainer');

/** @type {ParsedOntology | null} */
let parsedOntology = null;
/** @type {string} */
let currentFileName = '';
/** @type {NlpQaOntologyRow[]} */
let ontologyRows = [];
/** @type {NlpQaCheckedOntologyRow[]} */
let checkedRows = [];
/** @type {'all' | 'spelling' | 'grammar' | 'clean' | 'modified'} */
let activeFilter = 'all';
/** @type {NlpQaCheckModes} */
let scratchCheckModes = normalizeNlpQaCheckModes(DEFAULT_NLP_QA_CHECK_MODES);
/** @type {NlpQaCheckModes} */
let ontologyCheckModes = normalizeNlpQaCheckModes(DEFAULT_NLP_QA_ONTOLOGY_CHECK_MODES);
/** @type {{ text: string, status: string, issues: NlpQaIssue[], checkModes: NlpQaCheckModes }} */
let scratchState = { text: '', status: 'pass', issues: [], checkModes: scratchCheckModes };
/** @type {number | null} */
let saveTimer = null;
/** @type {number | null} */
let checkTimer = null;

/**
 * Returns the browser-global Compromise function when available.
 *
 * @returns {((text: string) => unknown) | null}
 */
function getNlpQaCompromiseRuntime() {
  const runtime = /** @type {typeof window & { nlp?: (text: string) => unknown }} */ (window);
  return typeof runtime.nlp === 'function' ? runtime.nlp : null;
}

/**
 * Sets the page status message.
 *
 * @param {string} message
 * @returns {void}
 */
function setStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Checks current rows from memory and re-renders the table.
 *
 * @returns {void}
 */
function refreshNlpQaCheckedStateFromMemory() {
  const lexicon = buildNlpQaOntologyLexicon(ontologyRows);
  const result = checkNlpQaOntologyTable(ontologyRows, {
    lexicon,
    compromiseNlp: getNlpQaCompromiseRuntime(),
    checkModes: ontologyCheckModes
  });
  checkedRows = result.rows;
  renderNlpQaOntologyTable(checkedRows, activeFilter, ontologyCheckModes, tableContainer);
  if (exportButton) {
    exportButton.disabled = !parsedOntology;
  }
}

/**
 * Renders the scratch checker state.
 *
 * @returns {void}
 */
function refreshNlpQaScratchState() {
  const lexicon = buildNlpQaOntologyLexicon(ontologyRows);
  const result = checkTextFieldWithNlpQa(scratchState.text, {
    lexicon,
    fieldName: 'scratch',
    compromiseNlp: getNlpQaCompromiseRuntime(),
    checkModes: scratchCheckModes
  });
  scratchState = {
    text: scratchState.text,
    status: result.status,
    issues: result.issues,
    checkModes: scratchCheckModes
  };
  renderNlpQaScratchChecker(scratchState, scratchContainer);
}

/**
 * Schedules durable persistence to IndexedDB.
 *
 * @returns {void}
 */
function scheduleNlpQaStatePersistence() {
  if (saveTimer != null) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    void saveLatestNlpQaStateToIndexedDb({
      fileName: currentFileName,
      rows: ontologyRows,
      filter: activeFilter,
      scratchCheckModes,
      ontologyCheckModes,
      scratch: scratchState
    }).catch((error) => {
      console.error('Error saving NLP QA state:', error);
    });
  }, 300);
}

/**
 * Loads the selected ontology file into memory.
 *
 * @returns {Promise<void>}
 */
async function loadSelectedOntologyForNlpQa() {
  const file = Array.from(filesInput?.files || [])[0];
  if (!file) {
    window.alert('Please select an ontology file.');
    return;
  }

  setStatus('Loading ontology annotations for NLP QA...');
  try {
    const text = await file.text();
    parsedOntology = await parseOntologyInput(text, file.name);
    currentFileName = file.name;
    ontologyRows = extractNlpQaOntologyRowsFromRdfStore(parsedOntology.store);
    activeFilter = 'all';
    refreshNlpQaScratchState();
    refreshNlpQaCheckedStateFromMemory();
    scheduleNlpQaStatePersistence();
    setStatus(`Loaded ${ontologyRows.length} annotation row(s) from ${file.name}.`);
  } catch (error) {
    console.error('Error loading ontology for NLP QA:', error);
    setStatus(error instanceof Error ? `Error: ${error.message}` : 'Error loading ontology annotations.');
  }
}

/**
 * Restores latest rows and scratch state from IndexedDB.
 *
 * @returns {Promise<void>}
 */
async function restoreLatestNlpQaState() {
  setStatus('Restoring latest NLP QA state...');
  try {
    const saved = await loadLatestNlpQaStateFromIndexedDb();
    const payload = /** @type {{ fileName?: string, rows?: NlpQaOntologyRow[], filter?: typeof activeFilter, scratchCheckModes?: Partial<NlpQaCheckModes>, ontologyCheckModes?: Partial<NlpQaCheckModes>, scratch?: typeof scratchState } | null} */ (saved?.payload || null);
    if (!payload || !Array.isArray(payload.rows)) {
      setStatus('No saved NLP QA state was found in IndexedDB.');
      return;
    }
    parsedOntology = null;
    currentFileName = payload.fileName || '';
    ontologyRows = payload.rows;
    activeFilter = payload.filter || 'all';
    scratchCheckModes = normalizeNlpQaCheckModes(payload.scratchCheckModes || payload.scratch?.checkModes, DEFAULT_NLP_QA_CHECK_MODES);
    ontologyCheckModes = normalizeNlpQaCheckModes(payload.ontologyCheckModes, DEFAULT_NLP_QA_ONTOLOGY_CHECK_MODES);
    scratchState = payload.scratch || { text: '', status: 'pass', issues: [], checkModes: scratchCheckModes };
    refreshNlpQaScratchState();
    refreshNlpQaCheckedStateFromMemory();
    setStatus(`Restored ${ontologyRows.length} row(s) from IndexedDB${currentFileName ? ` for ${currentFileName}` : ''}.`);
  } catch (error) {
    console.error('Error restoring NLP QA state:', error);
    setStatus(error instanceof Error ? `Error: ${error.message}` : 'Error restoring NLP QA state.');
  }
}

/**
 * Downloads the currently loaded RDF store using existing serializers.
 *
 * @returns {Promise<void>}
 */
async function downloadCurrentNlpQaOntologyAsTurtle() {
  if (!parsedOntology) {
    setStatus('Load an ontology file before exporting RDF.');
    return;
  }
  try {
    const text = await serializeOntologyStore(parsedOntology.store, 'text/turtle', {
      prefixes: parsedOntology.prefixes,
      baseIri: parsedOntology.baseIri
    });
    const stem = safeFilePart((currentFileName || 'ontology').replace(/\.[^.]+$/, '')) || 'ontology';
    downloadTextFile(`${stem}_nlp-qa_${getTimestampForFileName()}.ttl`, text, {
      mimeType: 'text/turtle;charset=utf-8'
    });
    setStatus('Downloaded Turtle export using the existing RDF serializer.');
  } catch (error) {
    console.error('Error exporting NLP QA RDF:', error);
    setStatus(error instanceof Error ? `Error: ${error.message}` : 'Error exporting RDF.');
  }
}

/**
 * Initializes the page.
 *
 * @returns {void}
 */
function initializeNlpQaPage() {
  refreshNlpQaScratchState();
  refreshNlpQaCheckedStateFromMemory();

  if (exportButton) {
    exportButton.disabled = true;
    exportButton.addEventListener('click', () => {
      void downloadCurrentNlpQaOntologyAsTurtle();
    });
  }
  loadButton?.addEventListener('click', () => {
    void loadSelectedOntologyForNlpQa();
  });
  restoreButton?.addEventListener('click', () => {
    void restoreLatestNlpQaState();
  });

  scratchContainer?.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLButtonElement) || event.target.id !== 'checkScratchTextBtn') {
      return;
    }
    const textarea = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('nlpQaScratchText'));
    scratchState = { ...scratchState, text: textarea?.value || '' };
    refreshNlpQaScratchState();
    scheduleNlpQaStatePersistence();
  });

  scratchContainer?.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const scope = event.target.getAttribute('data-nlpqa-check-scope');
    const mode = event.target.getAttribute('data-nlpqa-check-mode');
    if (scope && mode) {
      updateNlpQaCheckModesFromInput(scope, mode, event.target.checked);
    }
  });

  tableContainer?.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.id === 'nlpQaFilter') {
      const nextFilter = event.target.value;
      if (nextFilter === 'all' || nextFilter === 'spelling' || nextFilter === 'grammar' || nextFilter === 'clean' || nextFilter === 'modified') {
        activeFilter = nextFilter;
        renderNlpQaOntologyTable(checkedRows, activeFilter, ontologyCheckModes, tableContainer);
        scheduleNlpQaStatePersistence();
      }
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      const scope = event.target.getAttribute('data-nlpqa-check-scope');
      const mode = event.target.getAttribute('data-nlpqa-check-mode');
      if (scope && mode) {
        updateNlpQaCheckModesFromInput(scope, mode, event.target.checked);
      }
    }
  });

  tableContainer?.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLTextAreaElement)) {
      return;
    }
    const iri = event.target.getAttribute('data-nlpqa-iri') || '';
    const fieldName = event.target.getAttribute('data-nlpqa-field') || '';
    if (!iri || !fieldName) {
      return;
    }
    ontologyRows = updateNlpQaOntologyRowsWithEditedField(ontologyRows, iri, fieldName, event.target.value);
    if (checkTimer != null) {
      window.clearTimeout(checkTimer);
    }
    checkTimer = window.setTimeout(() => {
      refreshNlpQaCheckedStateFromMemory();
      scheduleNlpQaStatePersistence();
    }, 250);
  });

  setStatus('NLP Quality Assurance is ready. All processing stays local in the browser.');
}

/**
 * Updates checker mode state from a checkbox.
 *
 * @param {string} scope
 * @param {string} mode
 * @param {boolean} checked
 * @returns {void}
 */
function updateNlpQaCheckModesFromInput(scope, mode, checked) {
  if (mode !== 'spelling' && mode !== 'grammar' && mode !== 'aristotelian') {
    return;
  }
  if (scope === 'scratch') {
    scratchCheckModes = { ...scratchCheckModes, [mode]: checked };
    refreshNlpQaScratchState();
    scheduleNlpQaStatePersistence();
    return;
  }
  if (scope === 'ontology') {
    ontologyCheckModes = { ...ontologyCheckModes, [mode]: checked };
    refreshNlpQaCheckedStateFromMemory();
    scheduleNlpQaStatePersistence();
  }
}

initializeNlpQaPage();
