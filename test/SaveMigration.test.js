import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_THEME_ID,
  MIGRATED_SAVE_VERSION,
  isV2SaveData,
  migrateSaveData,
} from '../src/save/saveMigration.js';
import {
  THEME_PROGRESS_FIELDS,
  THEME_STATUSES,
  createThemeProgress,
  isThemeProgress,
} from '../src/adventure/adventureConfig.js';

function createV1Fixture() {
  return {
    version: 1,
    characterId: 'girl-explorer',
    hasSeenTutorial: true,
    inventory: { counts: { crystal: 2, flower: 4 } },
    quests: {
      progress: { 'crystal-explorer': 2, collector: 4 },
      completed: ['island-adventurer'],
      collectedItemIds: ['crystal-a', 'flower-a'],
      exploredLandmarkIds: ['camp'],
    },
    badges: { unlockedIds: ['island-explorer'] },
    nature: { discoveredIds: ['butterfly'] },
    natureQuests: { observationCount: 1, completedIds: [] },
    world: { collectedItemIds: ['crystal-a'], exploredLandmarkIds: ['camp'] },
  };
}

test('v1 save migrates to the v2 mystery-island envelope', () => {
  const result = migrateSaveData(createV1Fixture());
  assert.equal(result.ok, true);
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.version, MIGRATED_SAVE_VERSION);
  assert.ok(isV2SaveData(result.data));
  assert.deepEqual(Object.keys(result.data.themeProgress), [LEGACY_THEME_ID]);
});

test('migration preserves characterId at the global root', () => {
  const result = migrateSaveData(createV1Fixture());
  assert.equal(result.data.characterId, 'girl-explorer');
  assert.equal(Object.hasOwn(result.data.themeProgress[LEGACY_THEME_ID], 'characterId'), false);
});

test('migration preserves inventory, quests, badges, nature, natureQuests, and world exactly', () => {
  const source = createV1Fixture();
  const migrated = migrateSaveData(source).data.themeProgress[LEGACY_THEME_ID];

  for (const field of ['inventory', 'quests', 'badges', 'nature', 'natureQuests', 'world']) {
    assert.deepEqual(migrated[field], source[field], field);
  }
});

test('legacy tutorial state moves into mystery-island progress', () => {
  const source = createV1Fixture();
  const result = migrateSaveData(source);
  assert.equal(result.data.themeProgress[LEGACY_THEME_ID].hasSeenTutorial, true);
  assert.equal(Object.hasOwn(result.data, 'legacyData'), false);
});

test('legacy mystery-island progress gets in-progress status and optional placeholders', () => {
  const migrated = migrateSaveData(createV1Fixture()).data.themeProgress[LEGACY_THEME_ID];
  assert.equal(migrated.status, 'in-progress');
  assert.equal(migrated.collections, null);
  assert.equal(migrated.discoveries, null);
  assert.equal(migrated.completion, null);
  assert.ok(isThemeProgress(migrated));
});

test('natureQuests and world are part of the formal theme progress contract', () => {
  const source = createV1Fixture();
  const migrated = migrateSaveData(source).data.themeProgress[LEGACY_THEME_ID];
  const contract = createThemeProgress(THEME_STATUSES.IN_PROGRESS);

  assert.ok(THEME_PROGRESS_FIELDS.includes('natureQuests'));
  assert.ok(THEME_PROGRESS_FIELDS.includes('world'));
  assert.deepEqual(migrated.natureQuests, source.natureQuests);
  assert.deepEqual(migrated.world, source.world);
  assert.ok(isThemeProgress(migrated));
  assert.deepEqual(Object.keys(contract).sort(), [...THEME_PROGRESS_FIELDS, 'status'].sort());
  assert.equal(contract.natureQuests, null);
  assert.equal(contract.world, null);
});

test('unknown legacy data is preserved in the v2 legacyData extension', () => {
  const source = { ...createV1Fixture(), hasSeenTutorial: false, futureField: { nested: [1, 'x'] } };
  const migrated = migrateSaveData(source).data;
  assert.deepEqual(migrated.legacyData, {
    futureField: { nested: [1, 'x'] },
  });
  assert.equal(migrated.themeProgress[LEGACY_THEME_ID].hasSeenTutorial, false);
});

test('special unknown property names are preserved as own legacyData properties', () => {
  const source = JSON.parse('{"version":1,"characterId":"girl-explorer",'
    + '"__proto__":{"retained":"proto"},'
    + '"constructor":{"retained":"constructor"},'
    + '"prototype":{"retained":"prototype"}}');

  const result = migrateSaveData(source);
  const legacyData = result.data.legacyData;

  for (const [key, expected] of [
    ['__proto__', { retained: 'proto' }],
    ['constructor', { retained: 'constructor' }],
    ['prototype', { retained: 'prototype' }],
  ]) {
    assert.equal(Object.hasOwn(legacyData, key), true, key);
    assert.deepEqual(legacyData[key], expected, key);
  }
  assert.equal(Object.getPrototypeOf(legacyData), Object.prototype);
  assert.equal({}.retained, undefined);
});

test('migration is repeatable, leaves its input unchanged, and does not mutate nested values', () => {
  const source = createV1Fixture();
  const original = structuredClone(source);
  const first = migrateSaveData(source);
  const second = migrateSaveData(first.data);

  assert.deepEqual(source, original);
  assert.equal(first.status, 'migrated');
  assert.equal(second.status, 'already-v2');
  assert.deepEqual(second.data, first.data);
  second.data.themeProgress[LEGACY_THEME_ID].quests.progress.collector = 0;
  assert.equal(first.data.themeProgress[LEGACY_THEME_ID].quests.progress.collector, 4);
});

test('valid v2 data is returned unchanged in meaning and is not migrated again', () => {
  const source = migrateSaveData(createV1Fixture()).data;
  const result = migrateSaveData(source);

  assert.equal(result.status, 'already-v2');
  assert.ok(isV2SaveData(result.data));
  assert.deepEqual(result.data, source);
});

test('already-v2 progress accepts any valid theme status', () => {
  const source = migrateSaveData(createV1Fixture()).data;
  source.themeProgress[LEGACY_THEME_ID].status = 'completed';

  const result = migrateSaveData(source);
  assert.equal(result.status, 'already-v2');
  assert.equal(result.data.themeProgress[LEGACY_THEME_ID].status, 'completed');
});

test('v2 contract requires every formal field and permits optional null data', () => {
  const migrated = migrateSaveData(createV1Fixture()).data;
  const progress = migrated.themeProgress[LEGACY_THEME_ID];
  assert.ok(THEME_PROGRESS_FIELDS.every((field) => Object.hasOwn(progress, field)));
  assert.equal(isV2SaveData(migrated), true);
  delete progress.world;
  assert.equal(isV2SaveData(migrated), false);
});

test('unsupported or invalid version data is reported without being altered', () => {
  const future = { version: 3, characterId: 'girl-explorer', keep: true };
  assert.deepEqual(migrateSaveData(future), {
    ok: false,
    status: 'unsupported-version',
    data: null,
    sourceVersion: 3,
  });
  assert.equal(migrateSaveData(null).status, 'invalid-data');
  assert.equal(migrateSaveData({ version: 1 }).status, 'invalid-v1-data');
  assert.deepEqual(future, { version: 3, characterId: 'girl-explorer', keep: true });
});

test('missing optional v1 fields do not discard available state or extensions', () => {
  const source = {
    version: 1,
    characterId: 'girl-explorer',
    inventory: { counts: { crystal: 1 } },
    quests: { progress: { 'crystal-explorer': 1 } },
    badges: {},
    nature: {},
    world: { exploredLandmarkIds: ['camp'] },
    optionalExtension: { retained: true },
  };
  const result = migrateSaveData(source);
  const themeState = result.data.themeProgress[LEGACY_THEME_ID];

  assert.equal(result.ok, true);
  assert.deepEqual(themeState.inventory, source.inventory);
  assert.deepEqual(themeState.quests, source.quests);
  assert.deepEqual(themeState.world, source.world);
  assert.equal(themeState.natureQuests, null);
  assert.deepEqual(result.data.legacyData, { optionalExtension: { retained: true } });
  assert.ok(isV2SaveData(result.data));
});

test('v2 structural validation rejects missing theme progress', () => {
  assert.equal(isV2SaveData({ version: 2, characterId: 'girl-explorer', themeProgress: {} }), false);
});
