import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureThemeCompletionManager } from '../src/adventure/AdventureThemeCompletionManager.js';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { QUESTS } from '../src/quests/questConfig.js';
import { QuestManager } from '../src/quests/QuestManager.js';
import { SaveManager } from '../src/save/SaveManager.js';

const completedQuestState = () => ({
  progress: Object.fromEntries(QUESTS.map(({ id, target }) => [id, target])),
  completed: QUESTS.map(({ id }) => id),
  collectedItemIds: [],
  exploredLandmarkIds: [],
});

const makeV2Save = ({ completion = null, status = THEME_STATUSES.IN_PROGRESS } = {}) => ({
  version: 2,
  characterId: 'girl-explorer',
  themeProgress: {
    [THEME_IDS.MYSTERY_ISLAND]: {
      ...createThemeProgress(status),
      inventory: {},
      quests: completedQuestState(),
      badges: {},
      nature: {},
      natureQuests: {},
      world: {},
      completion,
    },
  },
});

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

test('completed third general quest evaluates and persists a completion summary', () => {
  const quests = new QuestManager();
  quests.loadState({
    progress: { 'crystal-explorer': 3, 'island-adventurer': 2, collector: 4 },
    completed: ['crystal-explorer', 'island-adventurer'],
  });
  const storage = new MemoryStorage();
  const saveManager = new SaveManager({ storage });
  const save = makeV2Save({
    status: THEME_STATUSES.IN_PROGRESS,
    completion: null,
  });
  save.themeProgress[THEME_IDS.MYSTERY_ISLAND].quests = quests.saveState();
  assert.equal(saveManager.save(save), true);

  let result;
  const unsubscribe = quests.subscribeCompleted(() => {
    result = new AdventureThemeCompletionManager({
      questSnapshot: quests.getSnapshot(),
      clock: () => 'fixed-time',
    }).evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  });
  quests.recordCollection('last-item', 'flower');
  unsubscribe();

  assert.equal(result.completed, true);
  const nextSave = saveManager.load();
  const island = nextSave.themeProgress[THEME_IDS.MYSTERY_ISLAND];
  island.status = THEME_STATUSES.COMPLETED;
  island.completion = result.completion;
  assert.equal(saveManager.save(nextSave), true);
  assert.equal(saveManager.load().themeProgress[THEME_IDS.MYSTERY_ISLAND].status, THEME_STATUSES.COMPLETED);
  assert.deepEqual(saveManager.load().themeProgress[THEME_IDS.MYSTERY_ISLAND].completion, {
    completed: true,
    completedAt: 'fixed-time',
    completionPolicy: 'required-quests',
  });
});

test('incomplete general quests do not mark mystery island completed', () => {
  const quests = new QuestManager();
  quests.loadState({ progress: { 'crystal-explorer': 3, 'island-adventurer': 2, collector: 4 }, completed: [] });
  const result = new AdventureThemeCompletionManager({
    questSnapshot: quests.getSnapshot(),
    clock: () => 'unused',
  }).evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, false);
  assert.equal(result.reason, 'required-quests-incomplete');
});

test('old v2 completed quest data is quietly repairable without re-emitting quest completion', () => {
  const storage = new MemoryStorage();
  const saveManager = new SaveManager({ storage });
  const oldSave = makeV2Save();
  assert.equal(saveManager.save(oldSave), true);

  const restored = saveManager.load();
  const quests = new QuestManager();
  let completionEvents = 0;
  quests.subscribeCompleted(() => { completionEvents += 1; });
  quests.loadState(restored.themeProgress[THEME_IDS.MYSTERY_ISLAND].quests);
  assert.equal(completionEvents, 0);

  const completionManager = new AdventureThemeCompletionManager({
    themeProgress: restored.themeProgress,
    questSnapshot: quests.getSnapshot(),
    clock: () => 'repaired-time',
  });
  const result = completionManager.evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, true);
  restored.themeProgress[THEME_IDS.MYSTERY_ISLAND].status = THEME_STATUSES.COMPLETED;
  restored.themeProgress[THEME_IDS.MYSTERY_ISLAND].completion = result.completion;
  assert.equal(saveManager.save(restored), true);

  const repaired = saveManager.load();
  assert.equal(repaired.themeProgress[THEME_IDS.MYSTERY_ISLAND].status, THEME_STATUSES.COMPLETED);
  assert.equal(repaired.themeProgress[THEME_IDS.MYSTERY_ISLAND].completion.completed, true);
  assert.equal(completionEvents, 0);
});

test('old v2 save with only two completed general quests remains in progress', () => {
  const storage = new MemoryStorage();
  const saveManager = new SaveManager({ storage });
  const oldSave = makeV2Save();
  oldSave.themeProgress[THEME_IDS.MYSTERY_ISLAND].quests.completed.pop();
  oldSave.themeProgress[THEME_IDS.MYSTERY_ISLAND].quests.progress.collector = 4;
  assert.equal(saveManager.save(oldSave), true);
  const restored = saveManager.load();
  const quests = new QuestManager();
  quests.loadState(restored.themeProgress[THEME_IDS.MYSTERY_ISLAND].quests);
  const result = new AdventureThemeCompletionManager({ questSnapshot: quests.getSnapshot() })
    .evaluateCompletion(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(result.completed, false);
  assert.equal(restored.themeProgress[THEME_IDS.MYSTERY_ISLAND].status, THEME_STATUSES.IN_PROGRESS);
});
