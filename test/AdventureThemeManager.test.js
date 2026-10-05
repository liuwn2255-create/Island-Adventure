import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureThemeManager } from '../src/adventure/AdventureThemeManager.js';
import { ADVENTURE_THEMES, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';

const ALL_THEME_IDS = Object.values(THEME_IDS);

test('manager returns all seven configured theme states', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  assert.deepEqual(manager.getThemes().map(({ theme }) => theme.id), ALL_THEME_IDS);
});

test('all seven themes are enterable without any other Theme completion', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  for (const themeId of ALL_THEME_IDS) {
    const state = manager.getThemeState(themeId);
    assert.equal(state.playable, true, themeId);
    assert.equal(state.canEnter, true, themeId);
    assert.equal(state.locked, undefined, 'Theme state should not expose an unlock-chain state');
    assert.equal(state.unlocked, undefined, 'Theme state should not expose an unlock-chain state');
    assert.equal(manager.selectTheme(themeId), state.theme);
  }
});

test('every Theme starts with its own start label when no saved progress exists', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  for (const themeId of ALL_THEME_IDS) {
    assert.equal(manager.hasProgress(themeId), false, themeId);
    assert.equal(manager.getActionLabel(themeId), '開始冒險', themeId);
  }
});

test('saved progress changes only that Theme to continue', () => {
  const savedProgress = {
    [THEME_IDS.OCEAN]: {
      status: THEME_STATUSES.IN_PROGRESS,
      quests: { completed: [] },
    },
  };
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES, themeProgress: savedProgress });
  assert.equal(manager.getThemeState(THEME_IDS.OCEAN).hasProgress, true);
  assert.equal(manager.getActionLabel(THEME_IDS.OCEAN), '繼續探險');
  for (const themeId of ALL_THEME_IDS.filter((id) => id !== THEME_IDS.OCEAN)) {
    assert.equal(manager.getThemeState(themeId).hasProgress, false, themeId);
    assert.equal(manager.getActionLabel(themeId), '開始冒險', themeId);
  }
});

test('Theme completion remains local and does not change any other Theme entry eligibility', () => {
  const manager = new AdventureThemeManager({
    themes: ADVENTURE_THEMES,
    themeProgress: {
      [THEME_IDS.MYSTERY_ISLAND]: {
        status: THEME_STATUSES.COMPLETED,
        completion: { completed: true },
      },
    },
  });
  assert.equal(manager.isThemeCompleted(THEME_IDS.MYSTERY_ISLAND), true);
  assert.equal(manager.getThemeState(THEME_IDS.MYSTERY_ISLAND).status, THEME_STATUSES.COMPLETED);
  for (const themeId of ALL_THEME_IDS.filter((id) => id !== THEME_IDS.MYSTERY_ISLAND)) {
    assert.equal(manager.canEnter(themeId), true, themeId);
    assert.equal(manager.getThemeState(themeId).hasProgress, false, themeId);
    assert.equal(manager.getActionLabel(themeId), '開始冒險', themeId);
  }
});

test('Theme IDs and progress buckets remain independent', () => {
  const themeProgress = {
    [THEME_IDS.FOREST]: { status: THEME_STATUSES.IN_PROGRESS, world: { visited: true } },
    [THEME_IDS.SPACE]: { status: THEME_STATUSES.COMPLETED, completion: { completed: true } },
  };
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES, themeProgress });
  assert.equal(manager.getActionLabel(THEME_IDS.FOREST), '繼續探險');
  assert.equal(manager.getActionLabel(THEME_IDS.SPACE), '已完成');
  assert.equal(manager.getActionLabel(THEME_IDS.MYSTERY_ISLAND), '開始冒險');
  assert.equal(manager.getThemeState(THEME_IDS.FOREST).progress, themeProgress[THEME_IDS.FOREST]);
  assert.equal(manager.getThemeState(THEME_IDS.SPACE).progress, themeProgress[THEME_IDS.SPACE]);
});

test('unknown theme IDs return safe non-enterable results', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  assert.equal(manager.getThemeState('unknown-theme'), null);
  assert.equal(manager.canEnter('unknown-theme'), false);
  assert.equal(manager.hasProgress('unknown-theme'), false);
  assert.equal(manager.selectTheme('unknown-theme'), null);
});

test('missing, null, empty, or incomplete progress is treated safely as no progress', () => {
  for (const themeProgress of [undefined, null, [], { [THEME_IDS.MYSTERY_ISLAND]: {} }]) {
    const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES, themeProgress });
    assert.equal(manager.getThemeState(THEME_IDS.MYSTERY_ISLAND).hasProgress, false);
    assert.equal(manager.getActionLabel(THEME_IDS.MYSTERY_ISLAND), '開始冒險');
  }
  const emptyBucketManager = new AdventureThemeManager({
    themeProgress: { [THEME_IDS.FOREST]: { status: THEME_STATUSES.AVAILABLE, quests: {} } },
  });
  assert.equal(emptyBucketManager.getActionLabel(THEME_IDS.FOREST), '開始冒險');
});

test('any non-empty per-Theme saved domain data counts as progress', () => {
  const manager = new AdventureThemeManager({
    themeProgress: { [THEME_IDS.ANCIENT_DESERT]: { status: THEME_STATUSES.AVAILABLE, discoveries: { ruins: ['a'] } } },
  });
  assert.equal(manager.hasProgress(THEME_IDS.ANCIENT_DESERT), true);
  assert.equal(manager.getActionLabel(THEME_IDS.ANCIENT_DESERT), '繼續探險');
});

test('manager does not mutate theme metadata or progress input', () => {
  const themes = Object.freeze(ADVENTURE_THEMES.map((theme) => Object.freeze({ ...theme })));
  const themeProgress = Object.freeze({
    [THEME_IDS.MYSTERY_ISLAND]: Object.freeze({ status: THEME_STATUSES.IN_PROGRESS, quests: {} }),
  });
  const themesBefore = structuredClone(themes);
  const progressBefore = structuredClone(themeProgress);
  const manager = new AdventureThemeManager({ themes, themeProgress });
  manager.getThemes();
  manager.selectTheme(THEME_IDS.MYSTERY_ISLAND);
  assert.deepEqual(themes, themesBefore);
  assert.deepEqual(themeProgress, progressBefore);
});

test('Mystery Island remains enterable after its own completion', () => {
  const manager = new AdventureThemeManager({
    themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: { status: THEME_STATUSES.COMPLETED } },
  });
  const state = manager.getThemeState(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(state.status, THEME_STATUSES.COMPLETED);
  assert.equal(state.playable, true);
  assert.equal(state.canEnter, true);
});

test('completed Theme shows completed label and remains enterable', () => {
  const manager = new AdventureThemeManager({
    themeProgress: { [THEME_IDS.FOREST]: { status: THEME_STATUSES.COMPLETED } },
  });
  const state = manager.getThemeState(THEME_IDS.FOREST);
  assert.equal(state.actionLabel, '已完成');
  assert.equal(state.canEnter, true);
});

test('Adventure cards receive safe quest, collectible, and badge summaries from each independent bucket', () => {
  const manager = new AdventureThemeManager({
    themeProgress: {
      [THEME_IDS.MAGIC_CASTLE]: {
        status: THEME_STATUSES.IN_PROGRESS,
        quests: {
          completed: ['magic-castle-explorer'],
          collectedItemIds: ['magic-collectible-1'],
        },
        collections: { collectedItemIds: ['magic-collectible-1', 'magic-collectible-2'] },
        badges: { unlockedIds: [] },
      },
      [THEME_IDS.SPACE]: {
        status: THEME_STATUSES.COMPLETED,
        completion: { completed: true },
        quests: { completed: ['space-explorer', 'space-collector'] },
        collections: { collectedItemIds: ['space-1', 'space-2', 'space-3', 'space-4', 'space-5'] },
        badges: { unlockedIds: ['space-explorer'] },
      },
    },
  });

  const castle = manager.getThemeState(THEME_IDS.MAGIC_CASTLE);
  assert.equal(castle.completed, false);
  assert.deepEqual(castle.questProgress, { completed: 1, total: 3 });
  assert.deepEqual(castle.collectibleProgress, { collected: 2, total: 5 });
  assert.equal(castle.hasBadge, false);
  assert.equal(castle.actionLabel, '繼續探險');

  const space = manager.getThemeState(THEME_IDS.SPACE);
  assert.equal(space.completed, true);
  assert.deepEqual(space.questProgress, { completed: 3, total: 3 });
  assert.deepEqual(space.collectibleProgress, { collected: 5, total: 5 });
  assert.equal(space.hasBadge, true);
  assert.equal(space.actionLabel, '已完成');
});

test('Adventure progress summaries safely use Island and Forest inventory counts when collection IDs are absent', () => {
  const manager = new AdventureThemeManager({
    themeProgress: {
      [THEME_IDS.MYSTERY_ISLAND]: {
        quests: { completed: ['crystal-explorer', 'collector'] },
        inventory: { counts: { 'ancient-coin': 3, 'mysterious-crystal': 2, 'pretty-shell': 0 } },
      },
      [THEME_IDS.FOREST]: {
        quests: null,
        inventory: { counts: { 'forest-seed': 1, 'forest-flower': 1 } },
        badges: null,
      },
    },
  });
  assert.deepEqual(manager.getThemeState(THEME_IDS.MYSTERY_ISLAND).questProgress, { completed: 2, total: 3 });
  assert.deepEqual(manager.getThemeState(THEME_IDS.MYSTERY_ISLAND).collectibleProgress, { collected: 5, total: 12 });
  assert.deepEqual(manager.getThemeState(THEME_IDS.FOREST).questProgress, { completed: 0, total: 3 });
  assert.deepEqual(manager.getThemeState(THEME_IDS.FOREST).collectibleProgress, { collected: 2, total: 5 });
  assert.equal(manager.getThemeState(THEME_IDS.FOREST).hasBadge, false);
});

test('summary derivation does not mutate Save v2 buckets', () => {
  const themeProgress = structuredClone({
    [THEME_IDS.MAGIC_CASTLE]: {
      status: THEME_STATUSES.IN_PROGRESS,
      quests: { completed: ['magic-castle-explorer'], collectedItemIds: ['magic-1'] },
      collections: { collectedItemIds: ['magic-1', 'magic-2'] },
      badges: { unlockedIds: ['magic-castle-explorer'] },
    },
  });
  const before = structuredClone(themeProgress);
  new AdventureThemeManager({ themeProgress }).getThemes();
  assert.deepEqual(themeProgress, before);
});
