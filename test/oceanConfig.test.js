import assert from 'node:assert/strict';
import test from 'node:test';
import { LANDMARK_DEFINITIONS } from '../src/interaction/interactableConfig.js';
import { ITEM_PICKUP_DISTANCE, ITEM_SPAWNS, ITEM_TYPES } from '../src/items/itemConfig.js';
import { QUESTS } from '../src/quests/questConfig.js';
import { ISLAND_WALKABLE_RADIUS } from '../src/config/gameConfig.js';
import { THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import {
  FOREST_COLLECTIBLE_TYPES,
  FOREST_COLLECTIBLES,
  FOREST_LANDMARKS,
  FOREST_QUESTS,
  FOREST_THEME,
} from '../src/themes/forest/forestConfig.js';
import {
  OCEAN_COLLECTIBLES,
  OCEAN_COLLECTIBLE_TYPES,
  OCEAN_LANDMARKS,
  OCEAN_QUESTS,
  OCEAN_THEME,
} from '../src/themes/ocean/oceanConfig.js';

const supportedQuestTypes = new Set(['collect_any', 'collect_item', 'explore_landmark']);
const isWithinPlayerWalkableRadius = ({ x, z }) => Math.hypot(x, z) < ISLAND_WALKABLE_RADIUS;

test('Ocean theme has the expected ID and name', () => {
  assert.equal(OCEAN_THEME.id, THEME_IDS.OCEAN);
  assert.equal(OCEAN_THEME.name, '深海探險');
});

test('Ocean has the three named landmarks with unique Ocean-only IDs', () => {
  assert.deepEqual(OCEAN_LANDMARKS.map(({ id, name }) => ({ id, name })), [
    { id: 'ocean-reef', name: '珊瑚礁秘境' },
    { id: 'ocean-sunken-ship', name: '沉船遺跡' },
    { id: 'ocean-deep-cave', name: '深海洞穴' },
  ]);
  const ids = OCEAN_LANDMARKS.map(({ id }) => id);
  assert.equal(new Set(ids).size, 3);
  const otherLandmarkIds = new Set([
    ...LANDMARK_DEFINITIONS.map(({ id }) => id),
    ...FOREST_LANDMARKS.map(({ id }) => id),
  ]);
  assert.ok(ids.every((id) => id.startsWith('ocean-') && !otherLandmarkIds.has(id)));
  assert.ok(OCEAN_LANDMARKS.every(({ position }) => isWithinPlayerWalkableRadius(position)));
});

test('Ocean has five unique spawns with five Ocean-specific collectible types and names', () => {
  const ids = OCEAN_COLLECTIBLES.map(({ id }) => id);
  assert.deepEqual(ids, [
    'ocean-collectible-1',
    'ocean-collectible-2',
    'ocean-collectible-3',
    'ocean-collectible-4',
    'ocean-collectible-5',
  ]);
  assert.equal(new Set(ids).size, 5);
  const existingItemIds = new Set([
    ...ITEM_SPAWNS.map(({ id }) => id),
    ...FOREST_COLLECTIBLES.map(({ id }) => id),
  ]);
  const collectibleTypeIds = OCEAN_COLLECTIBLE_TYPES.map(({ id }) => id);
  assert.equal(OCEAN_COLLECTIBLE_TYPES.length, 5);
  assert.equal(new Set(collectibleTypeIds).size, 5);
  assert.ok(OCEAN_COLLECTIBLE_TYPES.every(({ id, name }) => (
    id.startsWith('ocean-') && name && !ITEM_TYPES.some((itemType) => itemType.id === id)
  )));
  assert.ok(OCEAN_COLLECTIBLES.every(({ id, type, position, interactionDistance }) => (
    id.startsWith('ocean-')
    && !existingItemIds.has(id)
    && collectibleTypeIds.includes(type)
    && interactionDistance === ITEM_PICKUP_DISTANCE
    && isWithinPlayerWalkableRadius(position)
  )));
  assert.deepEqual(OCEAN_COLLECTIBLE_TYPES.map(({ id, name }) => ({ id, name })), [
    { id: 'ocean-deep-pearl', name: '深海珍珠' },
    { id: 'ocean-coral', name: '七彩珊瑚' },
    { id: 'ocean-deep-gem', name: '深海寶石' },
    { id: 'ocean-sunken-treasure', name: '沉船寶藏' },
    { id: 'ocean-mysterious-scale', name: '神秘魚鱗' },
  ]);
});

test('Ocean quests have unique IDs, supported types, and the requested targets', () => {
  assert.equal(OCEAN_QUESTS.length, 3);
  const ids = OCEAN_QUESTS.map(({ id }) => id);
  assert.equal(new Set(ids).size, 3);
  const existingQuestIds = new Set([
    ...QUESTS.map(({ id }) => id),
    ...FOREST_QUESTS.map(({ id }) => id),
  ]);
  assert.ok(ids.every((id) => id.startsWith('ocean-') && !existingQuestIds.has(id)));
  assert.ok(OCEAN_QUESTS.every(({ type, target }) => supportedQuestTypes.has(type) && target > 0));
  assert.deepEqual(OCEAN_QUESTS.map(({ id, type, target }) => ({ id, type, target })), [
    { id: 'ocean-explorer', type: 'explore_landmark', target: 3 },
    { id: 'ocean-collector', type: 'collect_any', target: 5 },
    { id: 'ocean-discoverer', type: 'explore_landmark', target: 2 },
  ]);
});

test('Ocean completion policy requires all three Ocean quests', () => {
  assert.deepEqual(OCEAN_THEME.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['ocean-explorer', 'ocean-collector', 'ocean-discoverer'],
  });
  assert.ok(OCEAN_THEME.completionPolicy.questIds.every((id) => OCEAN_QUESTS.some((quest) => quest.id === id)));
});

test('Ocean settings use independent immutable data and do not mutate source catalogs', () => {
  const sourceSnapshot = structuredClone({
    landmarks: LANDMARK_DEFINITIONS,
    islandCollectibles: ITEM_SPAWNS,
    itemTypes: ITEM_TYPES,
    oceanCollectibleTypes: OCEAN_COLLECTIBLE_TYPES,
    quests: QUESTS,
    forestLandmarks: FOREST_LANDMARKS,
    forestCollectibles: FOREST_COLLECTIBLES,
    forestCollectibleTypes: FOREST_COLLECTIBLE_TYPES,
    forestQuests: FOREST_QUESTS,
    forestTheme: FOREST_THEME,
  });
  assert.notEqual(OCEAN_LANDMARKS, FOREST_LANDMARKS);
  assert.notEqual(OCEAN_COLLECTIBLES, FOREST_COLLECTIBLES);
  assert.notEqual(OCEAN_COLLECTIBLE_TYPES, FOREST_COLLECTIBLE_TYPES);
  assert.ok(OCEAN_COLLECTIBLE_TYPES.every((type) => !FOREST_COLLECTIBLE_TYPES.some((forestType) => forestType.id === type.id)));
  assert.ok(OCEAN_COLLECTIBLE_TYPES.every((type) => !ITEM_TYPES.some((islandType) => islandType.name === type.name)));
  assert.notEqual(OCEAN_QUESTS, FOREST_QUESTS);
  assert.notEqual(OCEAN_THEME, FOREST_THEME);
  for (const oceanPosition of OCEAN_LANDMARKS.map(({ position }) => position)) {
    assert.ok(!FOREST_LANDMARKS.some(({ position }) => position === oceanPosition));
  }
  for (const oceanPosition of OCEAN_COLLECTIBLES.map(({ position }) => position)) {
    assert.ok(!FOREST_COLLECTIBLES.some(({ position }) => position === oceanPosition));
  }
  assert.ok(Object.isFrozen(OCEAN_THEME));
  assert.ok(Object.isFrozen(OCEAN_THEME.completionPolicy));
  assert.ok(Object.isFrozen(OCEAN_THEME.completionPolicy.questIds));
  assert.ok(Object.isFrozen(OCEAN_LANDMARKS));
  assert.ok(OCEAN_LANDMARKS.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.position)));
  assert.ok(Object.isFrozen(OCEAN_COLLECTIBLES));
  assert.ok(OCEAN_COLLECTIBLES.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.position)));
  assert.ok(Object.isFrozen(OCEAN_COLLECTIBLE_TYPES));
  assert.ok(OCEAN_COLLECTIBLE_TYPES.every((entry) => Object.isFrozen(entry)));
  assert.ok(Object.isFrozen(OCEAN_QUESTS));
  assert.ok(OCEAN_QUESTS.every((entry) => Object.isFrozen(entry)));
  assert.deepEqual({
    landmarks: LANDMARK_DEFINITIONS,
    islandCollectibles: ITEM_SPAWNS,
    itemTypes: ITEM_TYPES,
    oceanCollectibleTypes: OCEAN_COLLECTIBLE_TYPES,
    quests: QUESTS,
    forestLandmarks: FOREST_LANDMARKS,
    forestCollectibles: FOREST_COLLECTIBLES,
    forestCollectibleTypes: FOREST_COLLECTIBLE_TYPES,
    forestQuests: FOREST_QUESTS,
    forestTheme: FOREST_THEME,
  }, sourceSnapshot);
});
