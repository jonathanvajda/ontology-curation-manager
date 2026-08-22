const browserGlobals = {
  AbortController: 'readonly',
  Blob: 'readonly',
  BroadcastChannel: 'readonly',
  CustomEvent: 'readonly',
  DOMParser: 'readonly',
  DataTransfer: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLTableRowElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  HTMLElement: 'readonly',
  IDBDatabase: 'readonly',
  IDBFactory: 'readonly',
  IDBObjectStore: 'readonly',
  IDBRequest: 'readonly',
  IDBTransaction: 'readonly',
  MutationObserver: 'readonly',
  Node: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  XMLSerializer: 'readonly',
  alert: 'readonly',
  btoa: 'readonly',
  caches: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  customElements: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  getComputedStyle: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  indexedDB: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
  navigator: 'readonly',
  performance: 'readonly',
  queueMicrotask: 'readonly',
  requestAnimationFrame: 'readonly',
  require: 'readonly',
  self: 'readonly',
  sessionStorage: 'readonly',
  setImmediate: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly',
  window: 'readonly'
};

const vendorGlobals = {
  Comunica: 'readonly',
  N3: 'readonly',
  Tabulator: 'readonly',
  jsonld: 'readonly',
  $rdf: 'readonly'
};

const testGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  jest: 'readonly',
  test: 'readonly'
};

export default [
  {
    ignores: [
      'coverage/**',
      'node_modules/**',
      'docs/app/shared/vendor/**',
      '**/*.min.js',
      '**/(deprecated)_*.js'
    ]
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...vendorGlobals,
        process: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*.js', '**/__tests__/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: testGlobals
    }
  },
  {
    files: ['docs/queries/optional-manifest.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        DATA: 'writable'
      }
    }
  }
];
