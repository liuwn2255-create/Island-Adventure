import assert from 'node:assert/strict';
import test from 'node:test';
import { LANDMARK_DEFINITIONS } from '../src/interaction/interactableConfig.js';
import { ITEM_PICKUP_DISTANCE, ITEM_SPAWNS, ITEM_TYPES } from '../src/items/itemConfig.js';
import { QUESTS } from '../src/quests/questConfig.js';
import { ISLAND_WALKABLE_RADIUS } from '../src/config/gameConfig.js';
import { THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import {
  FOREST_COLLECTIBLES,
  FOREST_LANDMARKS,
  FOREST_QUESTS,
  FOREST_THEME,
} from '../src/themes/forest/forestConfig.js';

const supportedQuestTypes = new Set(['collect_any', 'collect_item', 'explore_landmark']);
const isWithinPlayerWalkableRadius = ({ x, z }) => Math.hypot(x, z) < ISLAND_WALKABLE_RADIUS;

test('Forest theme has the expected ID and name', () => {
  assert.equal(FOREST_THEME.id, THEME_IDS.FOREST);
  assert.equal(FOREST_THEME.name, '神秘森林');
});

test('Forest has at least three unique landmarks with positions inside the walkable radius', () => {
  assert.ok(FOREST_LANDMARKS.length >= 3);
  assert.deepEqual(FOREST_LANDMARKS.map(({ id }) => id), [
    'forest-entrance',
    'forest-stream',
    'forest-mysterious-rock',
  ]);
  assert.equal(new Set(FOREST_LANDMARKS.map(({ id }) => id)).size, FOREST_LANDMARKS.length);
  assert.ok(FOREST_LANDMARKS.every(({ id, name, position }) => id && name && isWithinPlayerWalkableRadius(position)));
  const islandLandmarkIds = new Set(LANDMARK_DEFINITIONS.map(({ id }) => id));
  assert.ok(FOREST_LANDMARKS.every(({ id }) => !islandLandmarkIds.has(id)));
});

test('Forest has at least five unique collectible spawns using existing item types', () => {
  assert.ok(FOREST_COLLECTIBLES.length >= 5);
  assert.deepEqual(FOREST_COLLECTIBLES.map(({ id }) => id), [
    'forest-collectible-1',
    'forest-collectible-2',
    'forest-collectible-3',
    'forest-collectible-4',
    'forest-collectible-5',
  ]);
  assert.equal(new Set(FOREST_COLLECTIBLES.map(({ id }) => id)).size, FOREST_COLLECTIBLES.length);
  const islandItemIds = new Set(ITEM_SPAWNS.map(({ id }) => id));
  const itemTypeIds = new Set(ITEM_TYPES.map(({ id }) => id));
  assert.ok(FOREST_COLLECTIBLES.every(({ id, type, position, interactionDistance }) => (
    !islandItemIds.has(id)
    && itemTypeIds.has(type)
    && interactionDistance === ITEM_PICKUP_DISTANCE
    && isWithinPlayerWalkableRadius(position)
  )));
});

test('Forest quests use unique Forest-prefixed IDs and QuestManager-supported types', () => {
  assert.equal(FOREST_QUESTS.length, 3);
  const questIds = FOREST_QUESTS.map(({ id }) => id);
  assert.equal(new Set(questIds).size, questIds.length);
  assert.ok(questIds.every((id) => id.startsWith('forest-')));
  const islandQuestIds = new Set(QUESTS.map(({ id }) => id));
  assert.ok(questIds.every((id) => !islandQuestIds.has(id)));
  assert.ok(FOREST_QUESTS.every(({ type, target }) => supportedQuestTypes.has(type) && target > 0));
  assert.deepEqual(FOREST_QUESTS.map(({ id, type, target }) => ({ id, type, target })), [
    { id: 'forest-explorer', type: 'explore_landmark', target: 3 },
    { id: 'forest-collector', type: 'collect_any', target: 5 },
    { id: 'forest-discoverer', type: 'explore_landmark', target: 2 },
  ]);
});

test('Forest completion policy requires all three Forest quests', () => {
  assert.deepEqual(FOREST_THEME.completionPolicy, {
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: ['forest-explorer', 'forest-collector', 'forest-discoverer'],
  });
  assert.ok(FOREST_THEME.completionPolicy.questIds.every((id) => FOREST_QUESTS.some((quest) => quest.id === id)));
});
