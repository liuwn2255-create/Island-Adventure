import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';

export const SPACE_COLLECTIBLE_TYPES = Object.freeze([
  Object.freeze({ id: 'space-crystal', name: '能量水晶', icon: '💎', description: '含有穩定宇宙能量的晶體。', visualType: 'space-crystal' }),
  Object.freeze({ id: 'space-star', name: '神秘星核', icon: '🌟', description: '一枚持續發光的微型星核。', visualType: 'space-star' }),
  Object.freeze({ id: 'space-metal', name: '外星金屬', icon: '🪙', description: '表面帶有未知刻痕的堅韌金屬碎片。', visualType: 'space-metal' }),
  Object.freeze({ id: 'space-artifact', name: '外星遺物', icon: '🛸', description: '來自古老外星文明的神秘裝置。', visualType: 'space-artifact' }),
  Object.freeze({ id: 'space-capsule', name: '太空艙零件', icon: '🔩', description: '可用於修復太空艙的精密零件。', visualType: 'space-capsule' }),
]);

export const SPACE_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'space-collectible-1', type: 'space-crystal', position: Object.freeze({ x: -10, z: 5 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'space-collectible-2', type: 'space-star', position: Object.freeze({ x: -2, z: -8 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'space-collectible-3', type: 'space-metal', position: Object.freeze({ x: 10, z: 2 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'space-collectible-4', type: 'space-artifact', position: Object.freeze({ x: -8, z: -8 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'space-collectible-5', type: 'space-capsule', position: Object.freeze({ x: 5, z: 10 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);
