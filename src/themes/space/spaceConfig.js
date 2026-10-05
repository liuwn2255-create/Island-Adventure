import { THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../../adventure/adventureConfig.js';

export const SPACE_THEME = Object.freeze({
  id: THEME_IDS.SPACE,
  name: '太空冒險',
  completionPolicy: Object.freeze({
    type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
    questIds: Object.freeze(['space-explorer', 'space-collector', 'space-discoverer']),
  }),
});

export const SPACE_LANDMARKS = Object.freeze([
  Object.freeze({
    id: 'space-station',
    name: '太空站',
    icon: '🛰️',
    description: '環繞星際航道的基地保存著探索宇宙所需的線索。',
    position: Object.freeze({ x: -6, z: -2 }),
  }),
  Object.freeze({
    id: 'alien-planet',
    name: '神秘外星行星',
    icon: '🪐',
    description: '這顆色彩奇異的行星表面散發著陌生而微弱的能量。',
    position: Object.freeze({ x: 7, z: -5 }),
  }),
  Object.freeze({
    id: 'space-observatory',
    name: '太空觀測站',
    icon: '🔭',
    description: '觀測站的巨大天線正追蹤遠方星系傳來的訊號。',
    position: Object.freeze({ x: 1, z: 8 }),
  }),
]);
