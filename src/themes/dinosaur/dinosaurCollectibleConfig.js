import { ITEM_PICKUP_DISTANCE } from '../../items/itemConfig.js';

export const DINOSAUR_COLLECTIBLE_TYPES = Object.freeze([
  Object.freeze({
    id: 'dinosaur-fossil',
    name: '恐龍化石',
    description: '一塊嵌著遠古骨骼痕跡的岩石化石。',
    icon: '🦴',
    collectibleType: 'dinosaur-fossil',
    visualType: 'dinosaur-fossil',
  }),
  Object.freeze({
    id: 'dinosaur-egg',
    name: '恐龍蛋',
    description: '一枚保存完好的橢圓形史前恐龍蛋。',
    icon: '🥚',
    collectibleType: 'dinosaur-egg',
    visualType: 'dinosaur-egg',
  }),
  Object.freeze({
    id: 'dinosaur-feather',
    name: '古代羽毛',
    description: '一根帶有遠古色澤的輕盈羽毛。',
    icon: '🪶',
    collectibleType: 'dinosaur-feather',
    visualType: 'dinosaur-feather',
  }),
  Object.freeze({
    id: 'dinosaur-tooth',
    name: '恐龍牙齒',
    description: '一枚尖銳而堅硬的遠古恐龍牙齒。',
    icon: '🦷',
    collectibleType: 'dinosaur-tooth',
    visualType: 'dinosaur-tooth',
  }),
  Object.freeze({
    id: 'dinosaur-amber',
    name: '琥珀化石',
    description: '一塊透出金橘光澤、封存古代痕跡的琥珀。',
    icon: '🟠',
    collectibleType: 'dinosaur-amber',
    visualType: 'dinosaur-amber',
  }),
]);

export const DINOSAUR_COLLECTIBLES = Object.freeze([
  Object.freeze({ id: 'dinosaur-collectible-1', type: 'dinosaur-fossil', position: Object.freeze({ x: -9, z: -4 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'dinosaur-collectible-2', type: 'dinosaur-egg', position: Object.freeze({ x: 10, z: 1 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'dinosaur-collectible-3', type: 'dinosaur-feather', position: Object.freeze({ x: -1, z: 10 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'dinosaur-collectible-4', type: 'dinosaur-tooth', position: Object.freeze({ x: -2, z: -8 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
  Object.freeze({ id: 'dinosaur-collectible-5', type: 'dinosaur-amber', position: Object.freeze({ x: -7, z: 8 }), interactionDistance: ITEM_PICKUP_DISTANCE }),
]);
