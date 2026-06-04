// app/nlp-qa-storage.js
// @ts-check

export const NLP_QA_DB_NAME = 'ocd-nlp-qa-db';
export const NLP_QA_DB_VERSION = 1;
export const NLP_QA_STATE_STORE_NAME = 'qaStates';
export const NLP_QA_LAST_STATE_KEY = 'last';

/**
 * @typedef {Object} NlpQaPersistedState
 * @property {string} key
 * @property {string} updatedAt
 * @property {unknown} payload
 */

/**
 * Converts an IndexedDB request into a promise.
 *
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T | null>}
 */
function convertNlpQaIndexedDbRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Resolves when a transaction completes.
 *
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function convertNlpQaIndexedDbTransactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Opens the NLP QA IndexedDB database.
 *
 * @returns {Promise<IDBDatabase>}
 */
function openNlpQaIndexedDbDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(NLP_QA_DB_NAME, NLP_QA_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NLP_QA_STATE_STORE_NAME)) {
        db.createObjectStore(NLP_QA_STATE_STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs an operation in the persisted QA state store.
 *
 * @template T
 * @param {'readonly' | 'readwrite'} mode
 * @param {(store: IDBObjectStore) => T | Promise<T>} operation
 * @returns {Promise<T>}
 */
async function runNlpQaIndexedDbStateStoreOperation(mode, operation) {
  const db = await openNlpQaIndexedDbDatabase();
  try {
    const tx = db.transaction(NLP_QA_STATE_STORE_NAME, mode);
    const store = tx.objectStore(NLP_QA_STATE_STORE_NAME);
    const result = await operation(store);
    await convertNlpQaIndexedDbTransactionToPromise(tx);
    return result;
  } finally {
    db.close();
  }
}

/**
 * Saves the latest NLP QA state.
 *
 * @param {unknown} payload
 * @returns {Promise<void>}
 */
export async function saveLatestNlpQaStateToIndexedDb(payload) {
  /** @type {NlpQaPersistedState} */
  const state = {
    key: NLP_QA_LAST_STATE_KEY,
    updatedAt: new Date().toISOString(),
    payload
  };
  await runNlpQaIndexedDbStateStoreOperation('readwrite', (store) => {
    return convertNlpQaIndexedDbRequestToPromise(store.put(state));
  });
}

/**
 * Loads the latest NLP QA state.
 *
 * @returns {Promise<NlpQaPersistedState | null>}
 */
export async function loadLatestNlpQaStateFromIndexedDb() {
  return runNlpQaIndexedDbStateStoreOperation('readonly', (store) => {
    return convertNlpQaIndexedDbRequestToPromise(
      /** @type {IDBRequest<NlpQaPersistedState>} */ (store.get(NLP_QA_LAST_STATE_KEY))
    );
  });
}
