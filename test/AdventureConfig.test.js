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
  isThemeMetadata,
  isThemeProgress,
  isThemeStatus,
} from '../src/adventure/adventureConfig.js';
import { CHARACTERS } from '../src/characters/characterConfig.js';
import { isCharacterMetadata } from '../src/characters/characterContracts.js';

test('theme IDs are unique and match the four reserved themes', () => {
  const ids = ADVENTURE_THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [
    THEME_IDS.MYSTERY_ISLAND,
    THEME_IDS.FOREST,
    THEME_IDS.OCEAN,
    THEME_IDS.DINOSAUR,
  ]);
});

test('mystery-island is the only currently enterable theme', () => {
  const playableThemes = ADVENTURE_THEMES.filter(canEnterTheme);
  assert.deepEqual(playableThemes.map((theme) => theme.id), [THEME_IDS.MYSTERY_ISLAND]);
  assert.equal(playableThemes[0].status, THEME_STATUSES.AVAILABLE);
});

test('reserved themes are locked and cannot be entered', () => {
  const reserved = ADVENTURE_THEMES.filter((theme) => theme.id !== THEME_IDS.MYSTERY_ISLAND);
  assert.equal(reserved.length, 3);
  for (const theme of reserved) {
    assert.equal(theme.status, THEME_STATUSES.LOCKED);
    assert.equal(theme.playable, false);
    assert.equal(canEnterTheme(theme), false);
  }
});

test('theme status accepts only the four contract values', () => {
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

test('all theme catalog entries satisfy the metadata contract', () => {
  assert.ok(ADVENTURE_THEMES.every(isThemeMetadata));
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
