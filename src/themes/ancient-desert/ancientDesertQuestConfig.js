import { ANCIENT_DESERT_LANDMARKS, ANCIENT_DESERT_COLLECTIBLES } from './ancientDesertConfig.js';

const landmarkIds = Object.freeze(ANCIENT_DESERT_LANDMARKS.map(({ id }) => id));
const collectibleIds = Object.freeze(ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id));

export const ANCIENT_DESERT_QUESTS = Object.freeze([
  Object.freeze({
    id: 'ancient-desert-explorer', name: '古文明沙漠探險家', title: '古文明沙漠探險家',
    description: '探索 3 個不同的古文明沙漠地標。', requiredAmount: 3, target: 3,
    type: 'explore_landmark', objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }),
    reward: 1, icon: '🏜️',
  }),
  Object.freeze({
    id: 'ancient-desert-collector', name: '古文明寶藏收藏家', title: '古文明寶藏收藏家',
    description: '收集 5 件古文明沙漠收藏品。', requiredAmount: 5, target: 5,
    type: 'collect_any', objective: Object.freeze({ type: 'collect_any', collectibleIds }),
    reward: 1, icon: '🏺',
  }),
  Object.freeze({
    id: 'ancient-desert-discoverer', name: '沙漠文明發現家', title: '沙漠文明發現家',
    description: '探索 2 個不同的古文明沙漠地標。', requiredAmount: 2, target: 2,
    type: 'explore_landmark', objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }),
    reward: 1, icon: '🔎',
  }),
]);
