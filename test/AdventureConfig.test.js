import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADVENTURE_THEMES,
  THEME_COMPLETION_POLICY_TYPES,
  THEME_IDS,
  THEME_PROGRESS_FIELDS,
  THEME_STATUSES,
  canEnterTheme,
  createThemeProgress,
  isCompletionPolicy,
  isThemeId,
  isThemeMetadata,
  isThemeProgress,
  isThemeStatus,
} from '../src/adventure/adventureConfig.js';
import { CHARACTERS } from '../src/characters/characterConfig.js';
import { isCharacterMetadata } from '../src/characters/characterContracts.js';

const EXPECTED_THEME_IDS = [
  'mystery-island', 'forest', 'ocean', 'dinosaur',
  'magic-castle', 'space', 'ancient-desert',
];

test('seven unique Theme IDs are registered and accepted by the save allowlist', () => {
  const ids = ADVENTURE_THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, 7);
  assert.deepEqual(ids, EXPECTED_THEME_IDS);
  assert.deepEqual(Object.values(THEME_IDS), EXPECTED_THEME_IDS);
  for (const id of EXPECTED_THEME_IDS) assert.equal(isThemeId(id), true);
});

test('all seven themes are enterable without Theme-to-Theme prerequisites', () => {
  assert.deepEqual(ADVENTURE_THEMES.filter(canEnterTheme).map((theme) => theme.id), EXPECTED_THEME_IDS);
  for (const theme of ADVENTURE_THEMES) {
    assert.equal(theme.playable, true);
    assert.equal(Object.hasOwn(theme, 'unlockRequirement'), false);
  }
});

test('Mystery Island and Forest keep their required quests; other themes defer completion', () => {
  const mystery = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.MYSTERY_ISLAND);
  assert.deepEqual(mystery.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['crystal-explorer', 'island-adventurer', 'collector'],
  });
  const forest = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.FOREST);
  assert.deepEqual(forest.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['forest-explorer', 'forest-collector', 'forest-discoverer'],
  });
  for (const theme of ADVENTURE_THEMES.filter((entry) => ![THEME_IDS.MYSTERY_ISLAND, THEME_IDS.FOREST].includes(entry.id))) {
    assert.deepEqual(theme.completionPolicy, { type: THEME_COMPLETION_POLICY_TYPES.DEFERRED });
  }
});

test('Theme status accepts only the four contract values', () => {
  assert.deepEqual(Object.values(THEME_STATUSES), ['locked', 'available', 'in-progress', 'completed']);
  for (const status of Object.values(THEME_STATUSES)) assert.equal(isThemeStatus(status), true);
  assert.equal(isThemeStatus('coming-soon'), false);
});

test('existing character has required ID, name, model path, and display metadata', () => {
  assert.equal(CHARACTERS.length, 1);
  assert.ok(CHARACTERS.every(isCharacterMetadata));
  assert.equal(CHARACTERS[0].id, 'girl-explorer');
  assert.ok(CHARACTERS[0].modelPath.endsWith('assets/characters/player/player.glb'));
  assert.equal(typeof CHARACTERS[0].displayMetadata.description, 'string');
});

test('all seven Theme metadata entries satisfy the data contract', () => {
  assert.equal(ADVENTURE_THEMES.length, 7);
  assert.ok(ADVENTURE_THEMES.every(isThemeMetadata));
  assert.deepEqual(ADVENTURE_THEMES.map(({ name }) => name), [
    '🏝️ 神秘島',
    '🌲 神秘森林',
    '🌊 深海探險',
    '🦕 恐龍世界',
    '🏰 魔法城堡',
    '🚀 太空探險',
    '🏜️ 古文明沙漠',
  ]);
  for (const theme of ADVENTURE_THEMES) {
    assert.equal(typeof theme.id, 'string');
    assert.equal(typeof theme.name, 'string');
    assert.equal(typeof theme.description, 'string');
    assert.ok(theme.completionPolicy);
    assert.ok(theme.status);
    assert.equal(theme.status, THEME_STATUSES.AVAILABLE);
    assert.equal(theme.playable, true);
  }
  assert.equal(isThemeMetadata({ ...ADVENTURE_THEMES[0], name: '' }), false);
});

test('completion policy supports deferred, manual, quest, and objective forms', () => {
  assert.equal(isCompletionPolicy({ type: THEME_COMPLETION_POLICY_TYPES.DEFERRED }), true);
  assert.equal(isCompletionPolicy({ type: THEME_COMPLETION_POLICY_TYPES.MANUAL }), true);
  assert.equal(isCompletionPolicy({ type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS, questIds: ['q1'] }), true);
  assert.equal(isCompletionPolicy({ type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_OBJECTIVES, objectiveIds: ['o1'] }), true);
  assert.equal(isCompletionPolicy({ type: 'unknown' }), false);
  assert.equal(isCompletionPolicy({ type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS, questIds: 'q1' }), false);
});

test('theme progress contract reserves independent domain state slots', () => {
  const progress = createThemeProgress(THEME_STATUSES.IN_PROGRESS);
  assert.equal(progress.status, THEME_STATUSES.IN_PROGRESS);
  assert.deepEqual(THEME_PROGRESS_FIELDS, [
    'quests', 'inventory', 'collections', 'discoveries', 'nature', 'natureQuests', 'badges', 'world', 'hasSeenTutorial', 'completion',
  ]);
  assert.ok(isThemeProgress(progress));
  assert.ok(isThemeProgress({ ...progress, quests: {}, collections: {}, completion: {} }));
  assert.equal(isThemeProgress({ ...progress, status: 'unknown' }), false);
  assert.throws(() => createThemeProgress('unknown'), TypeError);
});
