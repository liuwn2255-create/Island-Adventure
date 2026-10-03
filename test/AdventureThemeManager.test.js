import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureThemeManager } from '../src/adventure/AdventureThemeManager.js';
import { ADVENTURE_THEMES, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';

test('manager returns all four configured theme states', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  assert.deepEqual(manager.getThemes().map(({ theme }) => theme.id), [
    THEME_IDS.MYSTERY_ISLAND,
    THEME_IDS.FOREST,
    THEME_IDS.OCEAN,
    THEME_IDS.DINOSAUR,
  ]);
});

test('mystery island is enterable and offers start when it has no saved progress', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  const state = manager.getThemeState(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(state.playable, true);
  assert.equal(state.canEnter, true);
  assert.equal(state.hasProgress, false);
  assert.equal(state.actionLabel, '開始冒險');
  assert.equal(manager.selectTheme(THEME_IDS.MYSTERY_ISLAND), state.theme);
});

test('mystery island progress is kept distinct from metadata status', () => {
  const savedProgress = { [THEME_IDS.MYSTERY_ISLAND]: { status: THEME_STATUSES.IN_PROGRESS, quests: {} } };
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES, themeProgress: savedProgress });
  const state = manager.getThemeState(THEME_IDS.MYSTERY_ISLAND);
  assert.equal(state.status, THEME_STATUSES.AVAILABLE);
  assert.equal(state.progress, savedProgress[THEME_IDS.MYSTERY_ISLAND]);
  assert.equal(state.hasProgress, true);
  assert.equal(state.actionLabel, '繼續探險');
  assert.equal(manager.hasProgress(THEME_IDS.MYSTERY_ISLAND), true);
  assert.equal(manager.getActionLabel(THEME_IDS.MYSTERY_ISLAND), '繼續探險');
});

test('forest, ocean, and dinosaur are locked and cannot be selected', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  for (const themeId of [THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR]) {
    const state = manager.getThemeState(themeId);
    assert.equal(state.locked, true);
    assert.equal(state.canEnter, false);
    assert.equal(state.actionLabel, '尚未開放');
    assert.equal(manager.selectTheme(themeId), null);
  }
});

test('unknown theme IDs return safe non-enterable results', () => {
  const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES });
  assert.equal(manager.getThemeState('unknown-theme'), null);
  assert.equal(manager.canEnter('unknown-theme'), false);
  assert.equal(manager.hasProgress('unknown-theme'), false);
  assert.equal(manager.selectTheme('unknown-theme'), null);
});

test('missing, null, or incomplete progress is treated safely as no progress', () => {
  for (const themeProgress of [undefined, null, [], { [THEME_IDS.MYSTERY_ISLAND]: {} }]) {
    const manager = new AdventureThemeManager({ themes: ADVENTURE_THEMES, themeProgress });
    assert.equal(manager.getThemeState(THEME_IDS.MYSTERY_ISLAND).hasProgress, false);
    assert.equal(manager.getActionLabel(THEME_IDS.MYSTERY_ISLAND), '開始冒險');
  }
});

test('manager does not mutate theme metadata or progress input', () => {
  const themes = Object.freeze(ADVENTURE_THEMES.map((theme) => Object.freeze({ ...theme })));
  const themeProgress = Object.freeze({
    [THEME_IDS.MYSTERY_ISLAND]: Object.freeze({ status: THEME_STATUSES.IN_PROGRESS }),
  });
  const themesBefore = structuredClone(themes);
  const progressBefore = structuredClone(themeProgress);
  const manager = new AdventureThemeManager({ themes, themeProgress });
  manager.getThemes();
  manager.selectTheme(THEME_IDS.MYSTERY_ISLAND);
  assert.deepEqual(themes, themesBefore);
  assert.deepEqual(themeProgress, progressBefore);
});

test('metadata locking remains authoritative even when saved progress exists', () => {
  const manager = new AdventureThemeManager({
    themes: ADVENTURE_THEMES,
    themeProgress: { [THEME_IDS.FOREST]: { status: THEME_STATUSES.IN_PROGRESS } },
  });
  const forest = manager.getThemeState(THEME_IDS.FOREST);
  assert.equal(forest.hasProgress, true);
  assert.equal(forest.status, THEME_STATUSES.LOCKED);
  assert.equal(forest.canEnter, false);
  assert.equal(forest.actionLabel, '尚未開放');
});
