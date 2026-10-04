import { THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../../adventure/adventureConfig.js';
import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';

export const FOREST_THEME = Object.freeze({
  id: THEME_IDS.FOREST,
  name: '神秘森林',
  completionPolicy: Object.freeze({
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: Object.freeze([
      'forest-explorer',
      'forest-collector',
      'forest-discoverer',
    ]),
  }),
});

export const FOREST_LANDMARKS = Object.freeze([
  Object.freeze({
    id: 'forest-entrance',
    name: '森林入口',
    icon: '🌲',
    description: '沿著林間小徑，開始探索神秘森林。',
    position: Object.freeze({ x: 0, z: 6 }),
  }),
  Object.freeze({
    id: 'forest-stream',
    name: '林間溪流',
    icon: '💧',
    description: '清澈的溪水穿過樹林。',
    position: Object.freeze({ x: 4, z: 2 }),
  }),
  Object.freeze({
    id: 'forest-mysterious-rock',
    name: '神秘巨石',
    icon: '🪨',
    description: '巨石上留有古老的記號。',
    position: Object.freeze({ x: -4, z: -3 }),
  }),
]);

export const FOREST_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'forest-collectible-1', type: 'ancient-coin', position: Object.freeze({ x: -2, z: 1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'forest-collectible-2', type: 'mysterious-crystal', position: Object.freeze({ x: 2, z: 4 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'forest-collectible-3', type: 'pretty-shell', position: Object.freeze({ x: 5, z: -1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'forest-collectible-4', type: 'special-flower', position: Object.freeze({ x: -5, z: 2 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'forest-collectible-5', type: 'ancient-coin', position: Object.freeze({ x: 1, z: -6 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);

export const FOREST_QUESTS = Object.freeze([
  Object.freeze({
    id: 'forest-explorer',
    title: '森林探險家',
    description: '探索 3 個森林地標',
    type: 'explore_landmark',
    target: 3,
    reward: 1,
    icon: '🌲',
  }),
  Object.freeze({
    id: 'forest-collector',
    title: '森林收藏家',
    description: '收集 5 件森林收藏品',
    type: 'collect_any',
    target: 5,
    reward: 1,
    icon: '🍄',
  }),
  Object.freeze({
    id: 'forest-discoverer',
    title: '森林發現家',
    description: '探索 2 個森林地標',
    type: 'explore_landmark',
    target: 2,
    reward: 1,
    icon: '🔎',
  }),
]);
