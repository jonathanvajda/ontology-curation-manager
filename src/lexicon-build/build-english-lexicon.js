// src/lexicon-build/build-english-lexicon.js
// @ts-check

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  buildEnglishLexiconWordsFromPosLexicon,
  renderEnglishLexiconAssetModule
} from './lexicon-asset-builder.js';

const DEFAULT_OUTPUT_PATH = 'docs/app/data/nlp-qa-english-lexicon.js';

/**
 * @typedef {import('./lexicon-asset-builder.js').PosLexicon} PosLexicon
 */

/**
 * Parses command line arguments for the lexicon build script.
 *
 * @param {string[]} argv
 * @returns {{ inputPath: string, outputPath: string, includeProperNouns: boolean }}
 */
export function parseEnglishLexiconBuildArgs(argv) {
  const args = [...argv];
  const includeProperNouns = args.includes('--include-proper-nouns');
  const filteredArgs = args.filter((arg) => arg !== '--include-proper-nouns');
  return {
    inputPath: filteredArgs[0] || '',
    outputPath: filteredArgs[1] || DEFAULT_OUTPUT_PATH,
    includeProperNouns
  };
}

/**
 * Converts a TypeScript-ish lexicon file into sandbox-runnable JavaScript.
 *
 * @param {string} sourceText
 * @returns {string}
 */
export function convertLexiconSourceToSandboxScript(sourceText) {
  return String(sourceText || '')
    .replace(/export\s+interface\s+[A-Za-z_$][\w$]*\s*\{[\s\S]*?\}\s*/g, '')
    .replace(/=\s*<[^>]+>\s*\{/g, '= {')
    .replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g, 'module.exports = $1;')
    .replace(/export\s+default\s+/g, 'module.exports = ')
    .replace(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g, 'const $1 = exports.$1 =')
    .replace(/export\s+let\s+([A-Za-z_$][\w$]*)\s*=/g, 'let $1 = exports.$1 =')
    .replace(/export\s+var\s+([A-Za-z_$][\w$]*)\s*=/g, 'var $1 = exports.$1 =');
}

/**
 * Loads a POS lexicon object from common local source formats.
 *
 * @param {string} sourceText
 * @param {string} sourceName
 * @returns {PosLexicon}
 */
export function loadPosLexiconFromSourceText(sourceText, sourceName = 'lexicon source') {
  /** @type {{ POSTAGGER_LEXICON?: PosLexicon }} */
  const windowObject = {};
  /** @type {{ exports: unknown }} */
  const moduleObject = { exports: {} };
  /** @type {Record<string, unknown>} */
  const exportsObject = {};
  const sandbox = {
    window: windowObject,
    module: moduleObject,
    exports: exportsObject
  };

  vm.runInNewContext(convertLexiconSourceToSandboxScript(sourceText), sandbox, {
    filename: sourceName,
    timeout: 5000
  });

  const candidates = [
    windowObject.POSTAGGER_LEXICON,
    moduleObject.exports,
    exportsObject.lexicon,
    exportsObject.default
  ];

  for (const candidate of candidates) {
    if (isPosLexiconObject(candidate)) {
      return /** @type {PosLexicon} */ (candidate);
    }
    if (
      candidate &&
      typeof candidate === 'object' &&
      isPosLexiconObject(/** @type {{ lexicon?: unknown }} */ (candidate).lexicon)
    ) {
      return /** @type {PosLexicon} */ (/** @type {{ lexicon: unknown }} */ (candidate).lexicon);
    }
  }

  throw new Error(`No supported POS lexicon object found in ${sourceName}.`);
}

/**
 * Returns true when a value looks like a word-to-tags lexicon object.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPosLexiconObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(/** @type {Record<string, unknown>} */ (value))
    .slice(0, 20)
    .some((entry) => typeof entry === 'string' || Array.isArray(entry));
}

/**
 * Builds the generated English lexicon asset.
 *
 * @param {{ inputPath: string, outputPath?: string, includeProperNouns?: boolean }} options
 * @returns {Promise<{ wordCount: number, outputPath: string }>}
 */
export async function buildEnglishLexiconAsset(options) {
  if (!options.inputPath) {
    throw new Error('Usage: npm run build:nlp-qa-lexicon -- <input-lexicon-file> [output-file] [--include-proper-nouns]');
  }
  if (!existsSync(options.inputPath)) {
    throw new Error(
      [
        `Input lexicon file not found: ${options.inputPath}`,
        '',
        'Place an upstream lexicon file in src/lexicon-build/upstream/ first, then run for example:',
        'npm run build:nlp-qa-lexicon -- src/lexicon-build/upstream/lexicon.js',
        '',
        'Supported inputs include window.POSTAGGER_LEXICON = {...}, export const lexicon = {...}, and module.exports shapes.'
      ].join('\n')
    );
  }

  const outputPath = options.outputPath || DEFAULT_OUTPUT_PATH;
  const sourceText = await readFile(options.inputPath, 'utf8');
  const lexicon = loadPosLexiconFromSourceText(sourceText, options.inputPath);
  const words = buildEnglishLexiconWordsFromPosLexicon(lexicon, {
    includeProperNouns: Boolean(options.includeProperNouns)
  });
  const moduleText = renderEnglishLexiconAssetModule(words, {
    sourceLabel: path.basename(options.inputPath)
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, moduleText, 'utf8');
  return {
    wordCount: words.length,
    outputPath
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = parseEnglishLexiconBuildArgs(process.argv.slice(2));
  buildEnglishLexiconAsset(args)
    .then((result) => {
      console.log(`Built ${result.wordCount} English lexicon words at ${result.outputPath}.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
