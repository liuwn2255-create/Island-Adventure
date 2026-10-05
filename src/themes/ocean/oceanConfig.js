import { THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../../adventure/adventureConfig.js';
import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';

export const OCEAN_THEME = Object.freeze({
  id: THEME_IDS.OCEAN,
  name: '深海探險',
  completionPolicy: Object.freeze({
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: Object.freeze([
      'ocean-explorer',
      'ocean-collector',
      'ocean-discoverer',
    ]),
  }),
});

export const OCEAN_LANDMARKS = Object.freeze([
  Object.freeze({
    id: 'ocean-reef',
    name: '珊瑚礁秘境',
    icon: '🪸',
    description: '色彩繽紛的珊瑚礁中藏著海底的秘密。',
    position: Object.freeze({ x: 0, z: 6 }),
  }),
  Object.freeze({
    id: 'ocean-sunken-ship',
    name: '沉船遺跡',
    icon: '🚢',
    description: '古老沉船靜靜躺在深海之中。',
    position: Object.freeze({ x: 5, z: 0 }),
  }),
  Object.freeze({
    id: 'ocean-deep-cave',
    name: '深海洞穴',
    icon: '🕳️',
    description: '洞穴深處傳來微弱而神秘的光芒。',
    position: Object.freeze({ x: -5, z: -4 }),
  }),
]);

export const OCEAN_COLLECTIBLE_TYPES = Object.freeze([
  Object.freeze({ id: 'ocean-deep-pearl', name: '深海珍珠', icon: '🫧', visualType: 'pretty-shell' }),
  Object.freeze({ id: 'ocean-coral', name: '七彩珊瑚', icon: '🪸', visualType: 'special-flower' }),
  Object.freeze({ id: 'ocean-deep-gem', name: '深海寶石', icon: '💠', visualType: 'mysterious-crystal' }),
  Object.freeze({ id: 'ocean-sunken-treasure', name: '沉船寶藏', icon: '🪙', visualType: 'ancient-coin' }),
  Object.freeze({ id: 'ocean-mysterious-scale', name: '神秘魚鱗', icon: '🐟', visualType: 'pretty-shell' }),
]);

export const OCEAN_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'ocean-collectible-1', type: 'ocean-deep-pearl', position: Object.freeze({ x: -2, z: -1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ocean-collectible-2', type: 'ocean-coral', position: Object.freeze({ x: 2, z: -5 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ocean-collectible-3', type: 'ocean-deep-gem', position: Object.freeze({ x: 6, z: 2 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ocean-collectible-4', type: 'ocean-sunken-treasure', position: Object.freeze({ x: -6, z: 1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ocean-collectible-5', type: 'ocean-mysterious-scale', position: Object.freeze({ x: 1, z: 7 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);

export const OCEAN_QUESTS = Object.freeze([
  Object.freeze({
    id: 'ocean-explorer',
    title: '深海探險家',
    description: '探索 3 個深海地標',
    type: 'explore_landmark',
    target: 3,
    reward: 1,
    icon: '🌊',
  }),
  Object.freeze({
    id: 'ocean-collector',
    title: '深海收藏家',
    description: '收集 5 件深海收藏品',
    type: 'collect_any',
    target: 5,
    reward: 1,
    icon: '🐚',
  }),
  Object.freeze({
    id: 'ocean-discoverer',
    title: '深海發現家',
    description: '探索 2 個深海地標',
    type: 'explore_landmark',
    target: 2,
    reward: 1,
    icon: '🔎',
  }),
]);
