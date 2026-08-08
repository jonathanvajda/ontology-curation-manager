// app/nlp-qa-storage.js
// @ts-check

import {
  readProjectSettingValue,
  writeProjectSettingValue
} from './storage.js';

export const NLP_QA_LAST_STATE_KEY = 'ocd.nlpQa.lastState';

/**
 * @typedef {Object} NlpQaPersistedState
 * @property {string} updatedAt
 * @property {unknown} payload
 */

/**
 * Saves the latest NLP QA state.
 *
 * @param {unknown} payload
 * @returns {Promise<void>}
 */
export async function saveLatestNlpQaStateToIndexedDb(payload) {
  /** @type {NlpQaPersistedState} */
  const state = {
    updatedAt: new Date().toISOString(),
    payload
  };
  await writeProjectSettingValue(NLP_QA_LAST_STATE_KEY, state);
}

/**
 * Loads the latest NLP QA state.
 *
 * @returns {Promise<NlpQaPersistedState | null>}
 */
export async function loadLatestNlpQaStateFromIndexedDb() {
  return /** @type {Promise<NlpQaPersistedState | null>} */ (
    readProjectSettingValue(NLP_QA_LAST_STATE_KEY, null)
  );
}
