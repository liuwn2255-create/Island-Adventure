import { MAGIC_CASTLE_COLLECTIBLES, MAGIC_CASTLE_LANDMARKS } from './magicCastleConfig.js';

const landmarkIds = Object.freeze(MAGIC_CASTLE_LANDMARKS.map(({ id }) => id));
const collectibleIds = Object.freeze(MAGIC_CASTLE_COLLECTIBLES.map(({ id }) => id));

export const MAGIC_CASTLE_QUESTS = Object.freeze([
  Object.freeze({
    id: 'magic-castle-explorer', name: '魔法城堡探險家', title: '魔法城堡探險家',
    description: '探索 3 個不同的魔法城堡地標。', requiredAmount: 3, target: 3,
    type: 'explore_landmark', objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }),
    reward: 1, icon: '🏰',
  }),
  Object.freeze({
    id: 'magic-castle-collector', name: '魔法寶物收藏家', title: '魔法寶物收藏家',
    description: '收集 5 件魔法城堡收藏品。', requiredAmount: 5, target: 5,
    type: 'collect_any', objective: Object.freeze({ type: 'collect_any', collectibleIds }),
    reward: 1, icon: '✨',
  }),
  Object.freeze({
    id: 'magic-castle-discoverer', name: '魔法世界發現家', title: '魔法世界發現家',
    description: '探索 2 個不同的魔法城堡地標。', requiredAmount: 2, target: 2,
    type: 'explore_landmark', objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }),
    reward: 1, icon: '🌙',
  }),
]);
