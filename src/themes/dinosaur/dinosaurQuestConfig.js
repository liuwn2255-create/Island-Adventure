import { DINOSAUR_COLLECTIBLES } from './dinosaurCollectibleConfig.js';
import { DINOSAUR_LANDMARKS } from './dinosaurConfig.js';

const landmarkIds = Object.freeze(DINOSAUR_LANDMARKS.map(({ id }) => id));
const collectibleIds = Object.freeze(DINOSAUR_COLLECTIBLES.map(({ id }) => id));

export const DINOSAUR_QUESTS = Object.freeze([
  Object.freeze({
    id: 'dinosaur-explorer',
    name: '恐龍世界探險家',
    title: '恐龍世界探險家',
    description: '探索 3 個不同的恐龍世界地標。',
    requiredAmount: 3,
    type: 'explore_landmark',
    target: 3,
    objective: Object.freeze({
      type: 'explore_landmark',
      landmarkIds,
      distinct: true,
    }),
    reward: 1,
    icon: '🦕',
  }),
  Object.freeze({
    id: 'dinosaur-collector',
    name: '恐龍化石收藏家',
    title: '恐龍化石收藏家',
    description: '收集 5 件恐龍世界收藏品。',
    requiredAmount: 5,
    type: 'collect_any',
    target: 5,
    objective: Object.freeze({
      type: 'collect_any',
      collectibleIds,
    }),
    reward: 1,
    icon: '🦴',
  }),
  Object.freeze({
    id: 'dinosaur-discoverer',
    name: '史前世界發現家',
    title: '史前世界發現家',
    description: '探索 2 個不同的恐龍世界地標。',
    requiredAmount: 2,
    type: 'explore_landmark',
    target: 2,
    objective: Object.freeze({
      type: 'explore_landmark',
      landmarkIds,
      distinct: true,
    }),
    reward: 1,
    icon: '🔎',
  }),
]);
