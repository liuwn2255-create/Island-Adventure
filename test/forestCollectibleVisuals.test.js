import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { createCollectibleItems } from '../src/items/createCollectibleItems.js';
import { ITEM_SPAWNS, ITEM_TYPES } from '../src/items/itemConfig.js';
import { FOREST_COLLECTIBLE_TYPES, FOREST_COLLECTIBLES } from '../src/themes/forest/forestConfig.js';
import { FOREST_COLLECTIBLE_VISUAL_BUILDERS } from '../src/themes/forest/createForestCollectibleVisuals.js';

test('Forest collectible types use dedicated visual builders and recognizable silhouettes', () => {
  const scene = new THREE.Scene();
  const items = createCollectibleItems(
    scene,
    () => 0,
    FOREST_COLLECTIBLES,
    FOREST_COLLECTIBLE_TYPES,
    FOREST_COLLECTIBLE_VISUAL_BUILDERS,
  );

  assert.equal(items.length, 5);
  assert.ok(items.every(({ type }) => Object.hasOwn(FOREST_COLLECTIBLE_VISUAL_BUILDERS, type)));
  assert.ok(FOREST_COLLECTIBLE_TYPES.every(({ visualType }) => !['special-flower', 'mysterious-crystal', 'pretty-shell', 'ancient-coin'].includes(visualType)));
  assert.deepEqual(items.map(({ object3D }) => object3D.children.find((child) => child.name)?.name), [
    'magic-mushroom-stem', 'ancient-seed-body', 'butterfly-upper-left-wing', 'forest-feather-shaft', 'fairy-leaf-blade',
  ]);

  const geometrySignatures = items.map(({ object3D }) => object3D.children.map(({ geometry }) => geometry.type).join(','));
  assert.equal(new Set(geometrySignatures).size, 5);
  assert.ok(items.every(({ object3D }) => object3D.children.every((child) => child instanceof THREE.Mesh)));
  assert.ok(items[4].object3D.children.some(({ name }) => name === 'fairy-leaf-central-vein'));
  assert.equal(items[4].object3D.children.filter(({ name }) => name.startsWith('fairy-leaf-side-vein-')).length, 6);
  assert.equal(items[1].object3D.children[0].geometry.type, 'SphereGeometry');
});

test('Mystery Island keeps the original default collectible builders', () => {
  const scene = new THREE.Scene();
  const islandItems = createCollectibleItems(scene, () => 0, ITEM_SPAWNS, ITEM_TYPES);
  const originalVisuals = {
    'ancient-coin': 'CylinderGeometry',
    'mysterious-crystal': 'OctahedronGeometry',
    'pretty-shell': 'SphereGeometry',
    'special-flower': 'CylinderGeometry',
  };

  for (const [type, geometry] of Object.entries(originalVisuals)) {
    const item = islandItems.find(({ type: itemType }) => itemType === type);
    assert.ok(item);
    assert.equal(item.object3D.children[0].geometry.type, geometry);
    assert.ok(item.object3D.children.every((child) => child instanceof THREE.Mesh));
  }
});
