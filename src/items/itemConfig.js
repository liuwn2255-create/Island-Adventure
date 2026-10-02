import { INTERACTION_DISTANCE } from '../interaction/interactionConfig.js';

export const ITEM_TYPES = Object.freeze([
  Object.freeze({ id: 'ancient-coin', name: '古老硬幣', icon: '🪙', color: '#e4b94f' }),
  Object.freeze({ id: 'mysterious-crystal', name: '神秘水晶', icon: '💎', color: '#8cdded' }),
  Object.freeze({ id: 'pretty-shell', name: '漂亮貝殼', icon: '🐚', color: '#f0b9a7' }),
  Object.freeze({ id: 'special-flower', name: '特殊花朵', icon: '🌺', color: '#ec8eb0' }),
]);

export const ITEM_PICKUP_DISTANCE = INTERACTION_DISTANCE;

// Three objects of each kind: twelve finds distributed around the walkable island.
export const ITEM_SPAWNS = Object.freeze([
  { id: 'coin-01', type: 'ancient-coin', x: -1.8, z: -2.7 },
  { id: 'coin-02', type: 'ancient-coin', x: 7.2, z: -3.0 },
  { id: 'coin-03', type: 'ancient-coin', x: -5.1, z: -5.4 },
  { id: 'crystal-01', type: 'mysterious-crystal', x: 3.5, z: 5.9 },
  { id: 'crystal-02', type: 'mysterious-crystal', x: 0.0, z: -5.2 },
  { id: 'crystal-03', type: 'mysterious-crystal', x: 5.6, z: -5.7 },
  { id: 'shell-01', type: 'pretty-shell', x: 7.5, z: 2.7 },
  { id: 'shell-02', type: 'pretty-shell', x: 6.8, z: -2.0 },
  { id: 'shell-03', type: 'pretty-shell', x: -3.5, z: -4.5 },
  { id: 'flower-01', type: 'special-flower', x: -3.4, z: 1.6 },
  { id: 'flower-02', type: 'special-flower', x: 2.2, z: -2.1 },
  { id: 'flower-03', type: 'special-flower', x: -1.4, z: -6.1 },
].map((spawn) => Object.freeze({ ...spawn, position: Object.freeze({ x: spawn.x, z: spawn.z }), interactionDistance: ITEM_PICKUP_DISTANCE })));
