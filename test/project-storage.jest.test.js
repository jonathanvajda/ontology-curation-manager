import {
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  createMemoryRecordAdapter,
  createRunRecordStore,
  createSettingsStore
} from '../docs/app/shared/indexeddb-data-management/index.js';

test('OCD diagnostic run payloads fit the shared project run store contract', async () => {
  const runs = createRunRecordStore(createMemoryRecordAdapter());
  const settings = createSettingsStore(createMemoryRecordAdapter(), {
    scope: 'app:ontology-curation-manager',
    appId: 'ontology-curation-manager'
  });

  await runs.storeRunRecord({
    runId: 'single_1800000000000_a1b2',
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    runKind: 'diagnostic-single',
    label: 'Example ontology diagnostic',
    createdAt: '2026-08-02T12:00:00.000Z',
    payload: {
      id: 'single_1800000000000_a1b2',
      kind: 'single',
      label: 'Example ontology diagnostic',
      createdAt: '2026-08-02T12:00:00.000Z',
      payload: { summary: { violationCount: 0 } },
      uiState: null
    }
  });
  await settings.writeSettingValue('ocd.lastRunId', 'single_1800000000000_a1b2');

  const [record] = await runs.listRunRecords({
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    runKind: 'diagnostic-single'
  });
  expect(record.payload.kind).toBe('single');
  expect(await settings.readSettingValue('ocd.lastRunId')).toBe('single_1800000000000_a1b2');
});
