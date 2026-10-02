import { INTERACTION_DISTANCE } from './interactionConfig.js';

export const LANDMARK_DEFINITIONS = Object.freeze([
  {
    id: 'explorer-camp',
    icon: '⌂',
    kind: 'camp',
    position: Object.freeze({ x: -4.5, z: 6.4 }),
    title: '探險者營地',
    description: '看來以前有探險家來過這座島。也許這裡藏著什麼線索。',
    interactionDistance: INTERACTION_DISTANCE,
  },
  {
    id: 'mysterious-stele',
    icon: 'ᚠ',
    kind: 'stele',
    position: Object.freeze({ x: -8.0, z: 1.0 }),
    title: '神秘石碑',
    description: '石碑上刻著古老的符號。沒有人知道它代表什麼。',
    interactionDistance: INTERACTION_DISTANCE,
  },
  {
    id: 'ancient-tree',
    icon: '✦',
    kind: 'ancientTree',
    position: Object.freeze({ x: 5.5, z: 0.3 }),
    title: '巨大古樹',
    description: '這棵樹看起來已經存在很久了。樹下似乎曾經有人休息過。',
    interactionDistance: INTERACTION_DISTANCE,
  },
  {
    id: 'mysterious-crystal',
    icon: '◇',
    kind: 'crystal',
    position: Object.freeze({ x: 0.6, z: 8.9 }),
    title: '神秘水晶',
    description: '水晶散發著微弱的光芒。也許它與這座島的秘密有關。',
    interactionDistance: INTERACTION_DISTANCE,
  },
]);
