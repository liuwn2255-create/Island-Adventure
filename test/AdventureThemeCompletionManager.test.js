import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureThemeCompletionManager } from '../src/adventure/AdventureThemeCompletionManager.js';
import { ADVENTURE_THEMES, THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import { OCEAN_THEME } from '../src/themes/ocean/oceanConfig.js';
import { MAGIC_CASTLE_QUESTS } from '../src/themes/magic-castle/magicCastleQuestConfig.js';

const REQUIRED_QUEST_IDS = ['crystal-explorer', 'island-adventurer', 'collector'];
const FOREST_REQUIRED_QUEST_IDS = ['forest-explorer', 'forest-collector', 'forest-discoverer'];
const OCEAN_REQUIRED_QUEST_IDS = ['ocean-explorer', 'ocean-collector', 'ocean-discoverer'];
const makeSnapshot = (completedIds = REQUIRED_QUEST_IDS) =>
  REQUIRED_QUEST_IDS.map((id) => ({ id, completed: completedIds.includes(id) }));
const makeForestSnapshot = (completedIds = FOREST_REQUIRED_QUEST_IDS) =>
  FOREST_REQUIRED_QUEST_IDS.map((id) => ({ id, completed: completedIds.includes(id) }));

test('all three required mystery island quests allow completion', () => {
  const manager = new AdventureThemeCompletionManager({
    questSnapshot: makeSnapshot(),
    clock: () => '2026-10-03T00:00:00.000Z',
  });
  assert.equal(manager.canComplete(THEME_IDS.MYSTERY_ISLAND), true);
  assert.deepEqual(manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND), {
    completed: true,
    themeId: THEME_IDS.MYSTERY_ISLAND,
    completion: {
      completed: true,
      completedAt: '2026-10-03T00:00:00.000Z',
      completionPolicy: 'required-quests',
    },
  });
});

test('one or all incomplete quests prevent completion', () => {
  for (const completedIds of [['crystal-explorer', 'collector'], []]) {
    const manager = new AdventureThemeCompletionManager({ questSnapshot: makeSnapshot(completedIds) });
    assert.equal(manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND).reason, 'required-quests-incomplete');
  }
});

test('Forest completes only when all three Forest quests are complete', () => {
  const result = new AdventureThemeCompletionManager({
    questSnapshot: makeForestSnapshot(),
    clock: () => 'forest-time',
  }).evaluateCompletion(THEME_IDS.FOREST);
  assert.equal(result.completed, true);
  assert.equal(result.completion.completionPolicy, 'required-quests');
  assert.equal(result.completion.completedAt, 'forest-time');

  const incomplete = new AdventureThemeCompletionManager({
    questSnapshot: makeForestSnapshot(['forest-explorer', 'forest-discoverer']),
  }).evaluateCompletion(THEME_IDS.FOREST);
  assert.equal(incomplete.completed, false);
  assert.equal(incomplete.reason, 'required-quests-incomplete');
  assert.equal(incomplete.completion, null);
});

test('Magic Castle requires its three configured quests for completion', () => {
  const requiredIds = MAGIC_CASTLE_QUESTS.map(({ id }) => id);
  assert.deepEqual(ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.MAGIC_CASTLE).completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: requiredIds,
  });
  for (let count = 0; count < requiredIds.length; count += 1) {
    const snapshot = requiredIds.map((id, index) => ({ id, completed: index < count }));
    assert.equal(new AdventureThemeCompletionManager({ questSnapshot: snapshot }).evaluateCompletion(THEME_IDS.MAGIC_CASTLE).completed, false);
  }
  const complete = new AdventureThemeCompletionManager({
    questSnapshot: requiredIds.map((id) => ({ id, completed: true })),
    clock: () => 'castle-time',
  }).evaluateCompletion(THEME_IDS.MAGIC_CASTLE);
  assert.equal(complete.completed, true);
  assert.equal(complete.completion.completedAt, 'castle-time');
});

test('Ocean completes only when all three required Ocean quests exist and are complete', () => {
  const policy = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.OCEAN).completionPolicy;
  assert.deepEqual(policy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: OCEAN_REQUIRED_QUEST_IDS,
  });
  assert.deepEqual(OCEAN_THEME.completionPolicy.questIds, OCEAN_REQUIRED_QUEST_IDS);

  for (const missingQuestId of OCEAN_REQUIRED_QUEST_IDS) {
    const snapshot = OCEAN_REQUIRED_QUEST_IDS
      .filter((id) => id !== missingQuestId)
      .map((id) => ({ id, completed: true }));
    const result = new AdventureThemeCompletionManager({ questSnapshot: snapshot })
      .evaluateCompletion(THEME_IDS.OCEAN);
    assert.equal(result.completed, false);
    assert.equal(result.reason, 'required-quest-not-found');
    assert.deepEqual(result.missingQuestIds, [missingQuestId]);
  }

  for (const incompleteQuestId of OCEAN_REQUIRED_QUEST_IDS) {
    const snapshot = OCEAN_REQUIRED_QUEST_IDS.map((id) => ({ id, completed: id !== incompleteQuestId }));
    const result = new AdventureThemeCompletionManager({ questSnapshot: snapshot })
      .evaluateCompletion(THEME_IDS.OCEAN);
    assert.equal(result.completed, false);
    assert.equal(result.reason, 'required-quests-incomplete');
  }

  const complete = new AdventureThemeCompletionManager({
    questSnapshot: OCEAN_REQUIRED_QUEST_IDS.map((id) => ({ id, completed: true })),
    clock: () => 'ocean-time',
  }).evaluateCompletion(THEME_IDS.OCEAN);
  assert.equal(complete.completed, true);
  assert.equal(complete.themeId, THEME_IDS.OCEAN);
  assert.equal(complete.completion.completedAt, 'ocean-time');
  assert.equal(complete.completion.completionPolicy, 'required-quests');
});

test('unknown theme returns theme-not-found', () => {
  const result = new AdventureThemeCompletionManager().evaluateCompletion('unknown');
  assert.deepEqual(result, {
    completed: false, themeId: 'unknown', reason: 'theme-not-found', completion: null,
  });
});

test('missing quest snapshot is not treated as completion', () => {
  const result = new AdventureThemeCompletionManager().evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, false);
  assert.equal(result.reason, 'quest-snapshot-unavailable');
  assert.equal(result.completion, null);
});

test('missing or duplicate required quest entries cannot complete the theme', () => {
  const snapshot = makeSnapshot().filter((quest) => quest.id !== 'collector');
  const result = new AdventureThemeCompletionManager({ questSnapshot: snapshot }).evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, false);
  assert.equal(result.reason, 'required-quest-not-found');
  assert.deepEqual(result.missingQuestIds, ['collector']);
  const duplicate = [...makeSnapshot(), { id: 'collector', completed: true }];
  assert.equal(new AdventureThemeCompletionManager({ questSnapshot: duplicate }).evaluateCompletion(THEME_IDS.MYSTERY_ISLAND).completed, false);
});

test('an unknown required quest ID is not treated as completed', () => {
  const mysteryIsland = {
    ...ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.MYSTERY_ISLAND),
    completionPolicy: { type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS, questIds: ['unknown-quest'] },
  };
  const manager = new AdventureThemeCompletionManager({
    themes: [mysteryIsland],
    questSnapshot: [{ id: 'different-quest', completed: true }],
  });
  const result = manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, false);
  assert.equal(result.reason, 'required-quest-not-found');
  assert.deepEqual(result.missingQuestIds, ['unknown-quest']);
});
test('completedAt uses injected clock', () => {
  const result = new AdventureThemeCompletionManager({
    questSnapshot: makeSnapshot(), clock: () => 'fixed-time',
  }).evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completion.completedAt, 'fixed-time');
});

test('evaluateCompletion and completeTheme do not mutate inputs', () => {
  const questSnapshot = Object.freeze(makeSnapshot().map((quest) => Object.freeze(quest)));
  const themeProgress = Object.freeze({});
  const before = structuredClone({ questSnapshot, themeProgress });
  const manager = new AdventureThemeCompletionManager({ questSnapshot, themeProgress, clock: () => 'fixed-time' });
  manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  manager.completeTheme(THEME_IDS.MYSTERY_ISLAND);
  assert.deepEqual({ questSnapshot, themeProgress }, before);
});

test('completeTheme only returns the completion evaluation', () => {
  const manager = new AdventureThemeCompletionManager({ questSnapshot: makeSnapshot(), clock: () => 'fixed-time' });
  assert.deepEqual(manager.completeTheme(THEME_IDS.MYSTERY_ISLAND), manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND));
});

test('getCompletionResult agrees with evaluateCompletion', () => {
  const manager = new AdventureThemeCompletionManager({ questSnapshot: makeSnapshot(), clock: () => 'fixed-time' });
  assert.deepEqual(manager.getCompletionResult(THEME_IDS.MYSTERY_ISLAND), manager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND));
});

test('Mystery Island, Forest, Ocean, Ancient Desert, Space, and Magic Castle use their required-quests policies', () => {
  const mystery = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.MYSTERY_ISLAND);
  assert.deepEqual(mystery.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: REQUIRED_QUEST_IDS,
  });
  const forest = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.FOREST);
  assert.deepEqual(forest.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: FOREST_REQUIRED_QUEST_IDS,
  });
  const ocean = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.OCEAN);
  assert.deepEqual(ocean.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: OCEAN_REQUIRED_QUEST_IDS,
  });
  const ancientDesert = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.ANCIENT_DESERT);
  assert.deepEqual(ancientDesert.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['ancient-desert-explorer', 'ancient-desert-collector', 'ancient-desert-discoverer'],
  });
  const space = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.SPACE);
  assert.deepEqual(space.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['space-explorer', 'space-collector', 'space-discoverer'],
  });
  const magicCastle = ADVENTURE_THEMES.find((theme) => theme.id === THEME_IDS.MAGIC_CASTLE);
  assert.deepEqual(magicCastle.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: MAGIC_CASTLE_QUESTS.map(({ id }) => id),
  });
});

test('valid stored completion summary is reused only while required quests are complete', () => {
  const completion = { completed: true, completedAt: 'saved-time', completionPolicy: 'required-quests' };
  const manager = new AdventureThemeCompletionManager({
    themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: { completion } },
    questSnapshot: makeSnapshot(),
    clock: () => 'new-time',
  });
  assert.deepEqual(manager.getCompletionResult(THEME_IDS.MYSTERY_ISLAND).completion, completion);
  const incomplete = new AdventureThemeCompletionManager({
    themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: { completion } },
    questSnapshot: makeSnapshot(['crystal-explorer']),
  });
  assert.equal(incomplete.getCompletionResult(THEME_IDS.MYSTERY_ISLAND).completed, false);
});
