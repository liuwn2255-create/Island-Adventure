import assert from 'node:assert/strict';
import test from 'node:test';
import { SaveManager } from '../src/save/SaveManager.js';
import { LEGACY_THEME_ID, migrateSaveData } from '../src/save/saveMigration.js';

class MemoryStorage {
  constructor(initial = null) { this.value = initial; this.removeCount = 0; this.setCount = 0; }
  getItem() { return this.value; }
  setItem(_key, value) { this.value = value; this.setCount += 1; }
  removeItem() { this.value = null; this.removeCount += 1; }
}

function legacySave(overrides = {}) {
  return {
    version: 1,
    characterId: 'girl-explorer',
    inventory: { counts: { crystal: 2 } },
    quests: { progress: { 'crystal-explorer': 2 } },
    badges: { unlockedIds: ['island-explorer'] },
    nature: { discoveredIds: ['butterfly'] },
    natureQuests: { progress: { 'discover-life': 1 } },
    world: { exploredLandmarkIds: ['camp'] },
    hasSeenTutorial: true,
    ...overrides,
  };
}

function migratedSave() { return migrateSaveData(legacySave()).data; }
function setup(raw = null) {
  const storage = new MemoryStorage(raw);
  return { manager: new SaveManager({ storage }), storage };
}

test('v1 load migrates, validates, then persists v2', () => {
  const raw = JSON.stringify(legacySave());
  const { manager, storage } = setup(raw);
  const result = manager.loadResult();
  assert.equal(result.status, 'migrated');
  assert.equal(result.ok, true);
  assert.equal(storage.setCount, 1);
  assert.equal(storage.removeCount, 0);
  assert.deepEqual(JSON.parse(storage.value), result.data);
});

test('v1 progress values and tutorial state survive migration', () => {
  const source = legacySave();
  const { manager } = setup(JSON.stringify(source));
  const result = manager.loadResult();
  const island = result.data.themeProgress[LEGACY_THEME_ID];
  assert.equal(result.data.characterId, source.characterId);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'natureQuests', 'world']) {
    assert.deepEqual(island[field], source[field], field);
  }
  assert.equal(island.hasSeenTutorial, true);
  assert.equal(island.collections, null);
  assert.equal(island.discoveries, null);
  assert.equal(island.completion, null);
});

test('missing optional v1 fields receive safe v2 defaults', () => {
  const source = legacySave();
  delete source.natureQuests;
  delete source.hasSeenTutorial;
  const { manager } = setup(JSON.stringify(source));
  const island = manager.load().themeProgress[LEGACY_THEME_ID];
  assert.equal(island.natureQuests, null);
  assert.equal(island.hasSeenTutorial, false);
});

test('valid v2 loads without migration or rewrite', () => {
  const { manager, storage } = setup(JSON.stringify(migratedSave()));
  const result = manager.loadResult();
  assert.equal(result.status, 'loaded-v2');
  assert.equal(result.ok, true);
  assert.equal(storage.setCount, 0);
  assert.equal(storage.removeCount, 0);
});

test('invalid v1 is retained without clearing', () => {
  const source = legacySave();
  delete source.world;
  const raw = JSON.stringify(source);
  const { manager, storage } = setup(raw);
  assert.equal(manager.loadResult().status, 'invalid-v1');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('migration failure retains the original v1 bytes', () => {
  const raw = JSON.stringify(legacySave());
  const { manager, storage } = setup(raw);
  manager.migrateV1 = () => ({ ok: false, status: 'failed', data: null });
  assert.equal(manager.loadResult().status, 'migration-failed');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('migrated v2 validation failure retains original v1 bytes', () => {
  const raw = JSON.stringify(legacySave());
  const { manager, storage } = setup(raw);
  manager.migrateV1 = () => ({ ok: true, data: { version: 2, characterId: 'girl-explorer', themeProgress: {} } });
  assert.equal(manager.loadResult().status, 'migration-failed');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('migration write failure retains original v1 bytes', () => {
  const raw = JSON.stringify(legacySave());
  const storage = new MemoryStorage(raw);
  storage.setItem = () => { throw new Error('quota'); };
  const manager = new SaveManager({ storage });
  assert.equal(manager.loadResult().status, 'migration-write-failed');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('invalid v2 is retained without clearing', () => {
  const data = migratedSave();
  data.themeProgress[LEGACY_THEME_ID].quests = null;
  const raw = JSON.stringify(data);
  const { manager, storage } = setup(raw);
  assert.equal(manager.loadResult().status, 'invalid-v2');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('invalid JSON is retained without clearing', () => {
  const raw = '{broken';
  const { manager, storage } = setup(raw);
  assert.equal(manager.loadResult().status, 'invalid-json');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('unsupported versions are retained without clearing', () => {
  const raw = JSON.stringify({ ...legacySave(), version: 99 });
  const { manager, storage } = setup(raw);
  assert.equal(manager.loadResult().status, 'unsupported-version');
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('save accepts valid v2 data only', () => {
  const { manager, storage } = setup();
  assert.equal(manager.save(legacySave()), false);
  assert.equal(storage.value, null);
  assert.equal(manager.save({ ...migratedSave(), version: 1 }), false);
  const valid = migratedSave();
  assert.equal(manager.save(valid), true);
  assert.deepEqual(JSON.parse(storage.value), valid);
});

test('hasSave remains true when migration fails', () => {
  const raw = JSON.stringify(legacySave());
  const { manager, storage } = setup(raw);
  manager.migrateV1 = () => ({ ok: false, data: null });
  assert.equal(manager.hasSave(), true);
  assert.equal(storage.value, raw);
  assert.equal(storage.removeCount, 0);
});

test('getSaveData returns and persists migrated v2 data', () => {
  const raw = JSON.stringify(legacySave());
  const { manager, storage } = setup(raw);
  const data = manager.getSaveData();
  assert.equal(data.version, 2);
  assert.deepEqual(JSON.parse(storage.value), data);
});
