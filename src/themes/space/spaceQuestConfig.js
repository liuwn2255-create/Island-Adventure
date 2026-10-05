import { SPACE_COLLECTIBLES } from './spaceCollectibleConfig.js';
import { SPACE_LANDMARKS } from './spaceConfig.js';

const landmarkIds = Object.freeze(SPACE_LANDMARKS.map(({ id }) => id));
const collectibleIds = Object.freeze(SPACE_COLLECTIBLES.map(({ id }) => id));

export const SPACE_QUESTS = Object.freeze([
  Object.freeze({ id: 'space-explorer', name: '太空冒險家', title: '太空冒險家', description: '探索 3 個不同的太空地標。', requiredAmount: 3, type: 'explore_landmark', target: 3, objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }), reward: 1, icon: '🚀' }),
  Object.freeze({ id: 'space-collector', name: '太空收藏家', title: '太空收藏家', description: '收集 5 件太空收藏品。', requiredAmount: 5, type: 'collect_any', target: 5, objective: Object.freeze({ type: 'collect_any', collectibleIds }), reward: 1, icon: '💎' }),
  Object.freeze({ id: 'space-discoverer', name: '宇宙發現家', title: '宇宙發現家', description: '探索 2 個不同的太空地標。', requiredAmount: 2, type: 'explore_landmark', target: 2, objective: Object.freeze({ type: 'explore_landmark', landmarkIds, distinct: true }), reward: 1, icon: '🔭' }),
]);
