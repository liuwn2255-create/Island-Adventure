import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';
import { THEME_IDS } from '../../adventure/adventureConfig.js';

export const ANCIENT_DESERT_THEME = Object.freeze({
  id: THEME_IDS.ANCIENT_DESERT,
  name: '古文明沙漠',
});

export const ANCIENT_DESERT_LANDMARKS = Object.freeze([
  Object.freeze({
    id: 'ancient-desert-temple',
    name: '古文明神殿',
    description: '風沙掩埋了神殿的階梯，石柱上的古老刻痕仍清晰可見。',
    position: Object.freeze({ x: -7, z: -6 }),
  }),
  Object.freeze({
    id: 'ancient-desert-oasis',
    name: '沙漠綠洲',
    description: '棕櫚樹環繞著清澈水池，這片綠洲曾是商旅休息的所在。',
    position: Object.freeze({ x: 7, z: -5 }),
  }),
  Object.freeze({
    id: 'ancient-desert-ruins',
    name: '古代遺跡',
    description: '斷裂的石牆與倒塌石柱，留下失落文明的線索。',
    position: Object.freeze({ x: 0, z: 8 }),
  }),
]);

export const ANCIENT_DESERT_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'ancient-desert-collectible-1', type: 'ancient-desert-scarab', position: Object.freeze({ x: -9, z: 1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ancient-desert-collectible-2', type: 'ancient-desert-gem', position: Object.freeze({ x: 9, z: 1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ancient-desert-collectible-3', type: 'ancient-desert-coin', position: Object.freeze({ x: -2, z: -9 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ancient-desert-collectible-4', type: 'ancient-desert-tablet', position: Object.freeze({ x: 8, z: 5 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'ancient-desert-collectible-5', type: 'ancient-desert-crown', position: Object.freeze({ x: -6, z: 7 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);
