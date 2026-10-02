export const ISLAND_RESIDENT_CONFIG = Object.freeze({
  id: 'island-resident',
  name: '島嶼居民',
  icon: '💬',
  title: '💬 島嶼居民',
  position: Object.freeze({ x: -2.5, z: 6.4 }),
  model: Object.freeze({
    path: `${import.meta.env.BASE_URL}assets/characters/npc/Soldier.glb`,
    height: 1.8,
    yawOffset: Math.PI,
  }),
  interactionDistance: 1.55,
  patrol: Object.freeze({
    pointA: Object.freeze({ x: -0.1, z: 4.5 }),
    speed: 1.2,
    waitAtPoint: 2.5,
    waitAtStart: 4,
  }),
  dialogue: Object.freeze([
    '歡迎來到這座島！',
    '島上還有很多地方等你探索。',
  ]),
});
