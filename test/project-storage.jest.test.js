import {
  COMMON_NAMESPACE_IRIS
} from '../docs/app/shared/namespace-registry/index.js';
import {
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  createMemoryRecordAdapter,
  createRunRecordStore,
  createSettingsStore
} from '../docs/app/shared/indexeddb-data-management/index.js';

test('OCD diagnostic run payloads fit the shared project run store contract', async () => {
  const {
    convertSavedDiagnosticRunToJsonLd,
    readSavedDiagnosticRunFromJsonLd
  } = await import('../docs/app/storage.js');
  const runs = createRunRecordStore(createMemoryRecordAdapter());
  const settings = createSettingsStore(createMemoryRecordAdapter(), {
    scope: 'app:ontology-curation-manager',
    appId: 'ontology-curation-manager'
  });

  const savedRun = {
    id: 'single_1800000000000_a1b2',
    kind: 'single',
    label: 'Example ontology diagnostic',
    createdAt: '2026-08-02T12:00:00.000Z',
    payload: { summary: { violationCount: 0 } },
    uiState: null
  };
  const jsonLd = convertSavedDiagnosticRunToJsonLd(savedRun);

  await runs.storeRunRecord({
    runId: 'single_1800000000000_a1b2',
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    runKind: 'diagnostic-single',
    label: 'Example ontology diagnostic',
    createdAt: '2026-08-02T12:00:00.000Z',
    payload: jsonLd
  });
  await settings.writeSettingValue('ocd.lastRunId', 'single_1800000000000_a1b2');

  const [record] = await runs.listRunRecords({
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    runKind: 'diagnostic-single'
  });
  expect(record.payload['@type']).toBe(COMMON_NAMESPACE_IRIS.cceo.ComputerProgramExecution);
  expect(record.payload[COMMON_NAMESPACE_IRIS.okea.runKind]).toBe('single');
  expect(record.payload[COMMON_NAMESPACE_IRIS.dcterms.created]).toEqual({
    '@value': '2026-08-02T12:00:00.000Z',
    '@type': COMMON_NAMESPACE_IRIS.xsd.dateTime
  });
  expect(readSavedDiagnosticRunFromJsonLd(record.payload)).toEqual(savedRun);
  expect(await settings.readSettingValue('ocd.lastRunId')).toBe('single_1800000000000_a1b2');
});
