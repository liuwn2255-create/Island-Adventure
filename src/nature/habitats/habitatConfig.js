/** Small, fixed activity patches aligned with existing island flowers, trees, grass and terrain. */
export const CREATURE_HABITATS = Object.freeze({
  butterfly: Object.freeze({
    primaryArea: 'flowerArea',
    areas: Object.freeze([
      Object.freeze({ id: 'flowerArea', label: '花叢與開闊草地', center: Object.freeze({ x: 1.2, z: 2.1 }), radius: 0.7 }),
      Object.freeze({ id: 'forestEdge', label: '林邊', center: Object.freeze({ x: -8.1, z: 4.7 }), radius: 0.15 }),
      Object.freeze({ id: 'openGrassland', label: '開闊草地', center: Object.freeze({ x: 0.5, z: 0.8 }), radius: 0.2 }),
    ]),
  }),
  'taiwan-tree-frog': Object.freeze({
    primaryArea: 'grassArea',
    areas: Object.freeze([
      Object.freeze({ id: 'grassArea', label: '草叢', center: Object.freeze({ x: -8.55, z: -3.6 }), radius: 0.25 }),
      Object.freeze({ id: 'moistArea', label: '低矮植物與陰濕草叢', center: Object.freeze({ x: -8.7, z: -4.6 }), radius: 0.12 }),
      Object.freeze({ id: 'lowlandArea', label: '低地', center: Object.freeze({ x: -8.85, z: -3.6 }), radius: 0.12 }),
    ]),
  }),
});

export const HABITAT_SAFETY = Object.freeze({
  islandEdgeMargin: 0.55,
  oceanHeightMargin: 0.28,
  landmarkMargin: 0.55,
  collectibleMargin: 0.45,
  positionAttempts: 36,
});
