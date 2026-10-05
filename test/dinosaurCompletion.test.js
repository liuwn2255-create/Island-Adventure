import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureThemeCompletionManager } from '../src/adventure/AdventureThemeCompletionManager.js';
import { ADVENTURE_THEMES, THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import { DINOSAUR_QUESTS } from '../src/themes/dinosaur/dinosaurQuestConfig.js';

const dinosaurTheme = ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.DINOSAUR);
const requiredQuestIds = ['dinosaur-explorer', 'dinosaur-collector', 'dinosaur-discoverer'];

function snapshot(completedIds = requiredQuestIds) {
  return DINOSAUR_QUESTS.map((quest) => ({
    ...quest,
    progress: completedIds.includes(quest.id) ? quest.target : 0,
    completed: completedIds.includes(quest.id),
  }));
}

function evaluate(questSnapshot, themeProgress = {}) {
  return new AdventureThemeCompletionManager({
    themes: ADVENTURE_THEMES,
    themeProgress,
    questSnapshot,
  }).evaluateCompletion(THEME_IDS.DINOSAUR);
}

test('Dinosaur Adventure policy requires exactly the three Dinosaur quests', () => {
  assert.equal(dinosaurTheme.completionPolicy.type, THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS);
  assert.deepEqual(dinosaurTheme.completionPolicy.questIds, requiredQuestIds);
  assert.deepEqual(dinosaurTheme.completionPolicy.questIds, DINOSAUR_QUESTS.map(({ id }) => id));
});

test('0/3 Dinosaur quests leaves the world incomplete', () => {
  const result = evaluate(snapshot([]));
  assert.equal(result.completed, false);
  assert.equal(result.reason, 'required-quests-incomplete');
});

test('1/3 Dinosaur quest leaves the world incomplete', () => {
  assert.equal(evaluate(snapshot(['dinosaur-explorer'])).completed, false);
});

test('2/3 Dinosaur quests leave the world incomplete', () => {
  assert.equal(evaluate(snapshot(['dinosaur-explorer', 'dinosaur-collector'])).completed, false);
});

test('3/3 Dinosaur quests complete the world with the required-quests policy', () => {
  const result = evaluate(snapshot());
  assert.equal(result.completed, true);
  assert.equal(result.themeId, THEME_IDS.DINOSAUR);
  assert.equal(result.completion.completionPolicy, THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS);
  assert.equal(typeof result.completion.completedAt, 'string');
});

test('Dinosaur completion is independent of quest snapshot order', () => {
  assert.equal(evaluate(snapshot().reverse()).completed, true);
});

test('a missing required Dinosaur quest prevents completion', () => {
  const completeSnapshot = snapshot();
  for (const requiredId of requiredQuestIds) {
    assert.equal(evaluate(completeSnapshot.filter(({ id }) => id !== requiredId)).completed, false, requiredId);
  }
});

test('reload reuses the completed Dinosaur summary from its existing v2 progress bucket', () => {
  const storedCompletion = {
    completed: true,
    completedAt: '2026-10-04T12:00:00.000Z',
    completionPolicy: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
  };
  const result = evaluate(snapshot(), {
    [THEME_IDS.DINOSAUR]: { completion: storedCompletion },
  });
  assert.deepEqual(result.completion, storedCompletion);
});

test('stored Dinosaur completion is rejected while any required quest remains incomplete', () => {
  const storedCompletion = {
    completed: true,
    completedAt: '2026-10-04T12:00:00.000Z',
    completionPolicy: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
  };
  const result = evaluate(snapshot(['dinosaur-explorer', 'dinosaur-collector']), {
    [THEME_IDS.DINOSAUR]: { completion: storedCompletion },
  });
  assert.equal(result.completed, false);
  assert.equal(result.completion, null);
});

test('Dinosaur evaluation uses the shared AdventureThemeCompletionManager and leaves world progress inputs unchanged', () => {
  const themeProgress = {
    [THEME_IDS.MYSTERY_ISLAND]: { status: 'completed', marker: 'island' },
    [THEME_IDS.FOREST]: { status: 'completed', marker: 'forest' },
    [THEME_IDS.OCEAN]: { status: 'completed', marker: 'ocean' },
  };
  const progressBefore = structuredClone(themeProgress);
  const quests = snapshot();
  const questsBefore = structuredClone(quests);
  assert.equal(evaluate(quests, themeProgress).completed, true);
  assert.deepEqual(themeProgress, progressBefore);
  assert.deepEqual(quests, questsBefore);
});

test('Island, Forest, and Ocean policies remain unchanged by Dinosaur completion policy', () => {
  const expected = new Map([
    [THEME_IDS.MYSTERY_ISLAND, ['crystal-explorer', 'island-adventurer', 'collector']],
    [THEME_IDS.FOREST, ['forest-explorer', 'forest-collector', 'forest-discoverer']],
    [THEME_IDS.OCEAN, ['ocean-explorer', 'ocean-collector', 'ocean-discoverer']],
  ]);
  for (const [themeId, questIds] of expected) {
    assert.deepEqual(
      ADVENTURE_THEMES.find(({ id }) => id === themeId).completionPolicy.questIds,
      questIds,
      themeId,
    );
  }
});
