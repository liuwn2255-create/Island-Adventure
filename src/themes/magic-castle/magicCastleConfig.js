import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';
import { THEME_IDS } from '../../adventure/adventureConfig.js';

export const MAGIC_CASTLE_THEME = Object.freeze({
  id: THEME_IDS.MAGIC_CASTLE,
  name: '魔法城堡',
});

export const MAGIC_CASTLE_LANDMARKS = Object.freeze([
  Object.freeze({
    id: 'magic-castle',
    name: '魔法城堡',
    icon: '🏰',
    description: '高聳的藍晶塔樓環繞著古老城門，城堡深處似乎仍有魔法在流動。',
    position: Object.freeze({ x: 0, z: -8 }),
  }),
  Object.freeze({
    id: 'wizard-tower',
    name: '魔法師高塔',
    icon: '🧙',
    description: '塔頂的星象儀指向夜空，石窗間透出神秘的紫色光芒。',
    position: Object.freeze({ x: -9, z: -2 }),
  }),
  Object.freeze({
    id: 'enchanted-garden',
    name: '魔法花園',
    icon: '🌙',
    description: '月光照亮了會發光的花朵與中央噴泉，花園裡充滿柔和魔力。',
    position: Object.freeze({ x: 9, z: -2 }),
  }),
]);

export const MAGIC_CASTLE_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'magic-collectible-1', type: 'magic-crystal', position: Object.freeze({ x: -9, z: 6 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'magic-collectible-2', type: 'wizard-scroll', position: Object.freeze({ x: -2, z: 4 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'magic-collectible-3', type: 'enchanted-key', position: Object.freeze({ x: 10, z: 6 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'magic-collectible-4', type: 'fairy-gem', position: Object.freeze({ x: -3, z: -14 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'magic-collectible-5', type: 'magic-potion', position: Object.freeze({ x: 4, z: 11 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);
