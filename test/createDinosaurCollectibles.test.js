import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDinosaurScene } from '../src/themes/dinosaur/createDinosaurScene.js';
import { createDinosaurCollectibles } from '../src/themes/dinosaur/createDinosaurCollectibles.js';
import { DINOSAUR_COLLECTIBLES, DINOSAUR_COLLECTIBLE_TYPES } from '../src/themes/dinosaur/dinosaurCollectibleConfig.js';
import { DINOSAUR_LANDMARKS } from '../src/themes/dinosaur/dinosaurConfig.js';
import { ITEM_PICKUP_DISTANCE } from '../src/items/itemConfig.js';
import { SAVE_VERSION } from '../src/save/saveConfig.js';

const expectedTypes = [
  ['dinosaur-fossil', '恐龍化石'],
  ['dinosaur-egg', '恐龍蛋'],
  ['dinosaur-feather', '古代羽毛'],
  ['dinosaur-tooth', '恐龍牙齒'],
  ['dinosaur-amber', '琥珀化石'],
];
const expectedSpawnIds = [1, 2, 3, 4, 5].map((number) => `dinosaur-collectible-${number}`);

test('Dinosaur has five unique collectible definitions with descriptions and distinct types', () => {
  assert.deepEqual(DINOSAUR_COLLECTIBLE_TYPES.map(({ id, name }) => [id, name]), expectedTypes);
  assert.equal(new Set(DINOSAUR_COLLECTIBLE_TYPES.map(({ id }) => id)).size, 5);
  for (const definition of DINOSAUR_COLLECTIBLE_TYPES) {
    assert.ok(definition.description);
    assert.equal(definition.collectibleType, definition.id);
    assert.equal(definition.visualType, definition.id);
  }
});

test('Dinosaur has five valid fixed spawns outside the landmark centers', () => {
  assert.deepEqual(DINOSAUR_COLLECTIBLES.map(({ id }) => id), expectedSpawnIds);
  assert.equal(new Set(DINOSAUR_COLLECTIBLES.map(({ id }) => id)).size, 5);
  for (const spawn of DINOSAUR_COLLECTIBLES) {
    assert.ok(DINOSAUR_COLLECTIBLE_TYPES.some(({ id }) => id === spawn.type));
    assert.equal(spawn.interactionDistance, ITEM_PICKUP_DISTANCE);
    assert.ok(Number.isFinite(spawn.position.x));
    assert.ok(Number.isFinite(spawn.position.z));
    for (const landmark of DINOSAUR_LANDMARKS) {
      const distance = Math.hypot(spawn.position.x - landmark.position.x, spawn.position.z - landmark.position.z);
      assert.ok(distance > 3.5, `${spawn.id} overlaps landmark ${landmark.id}`);
    }
  }
});

test('Dinosaur collectible factory returns five scene objects through the standard item API', () => {
  const { scene, dispose } = createDinosaurScene();
  try {
    const items = createDinosaurCollectibles(scene);
    assert.equal(items.length, 5);
    assert.deepEqual(items.map(({ id }) => id), expectedSpawnIds);
    for (const item of items) {
      assert.ok(item.object3D instanceof THREE.Group);
      assert.equal(item.object3D.parent, scene);
      assert.ok(item.name);
      assert.ok(item.icon);
      assert.equal(item.collected, false);
      assert.ok(item.object3D.children.some((child) => child.isMesh));
    }
  } finally {
    assert.doesNotThrow(dispose);
  }
});

test('five Dinosaur collectible visuals have distinct identifying model structures', () => {
  const { scene, dispose } = createDinosaurScene();
  try {
    const items = createDinosaurCollectibles(scene);
    const namesByItem = items.map((item) => {
      const names = [];
      item.object3D.traverse((object) => { if (object.isMesh) names.push(object.name); });
      return names;
    });
    assert.ok(namesByItem[0].some((name) => name === 'DinosaurFossilBackbone'));
    assert.ok(namesByItem[0].some((name) => name === 'DinosaurFossilSkull'));
    assert.ok(namesByItem[0].some((name) => name.startsWith('DinosaurFossilRib-')));
    assert.ok(namesByItem[1].some((name) => name === 'DinosaurEggOval'));
    assert.ok(namesByItem[2].some((name) => name === 'DinosaurFeatherShaft'));
    assert.ok(namesByItem[3].some((name) => name === 'DinosaurToothPoint'));
    assert.ok(namesByItem[4].some((name) => name === 'DinosaurAmberCrystal'));
    assert.equal(new Set(namesByItem.map((names) => names.filter(Boolean)[0])).size, 5);
    assert.notEqual(namesByItem[2].length, namesByItem[3].length);
  } finally {
    assert.doesNotThrow(dispose);
  }
});

test('Dinosaur scene cleanup disposes collectible visuals without affecting Save v2', () => {
  const versionBefore = SAVE_VERSION;
  const { scene, dispose } = createDinosaurScene();
  createDinosaurCollectibles(scene);
  assert.doesNotThrow(dispose);
  assert.equal(SAVE_VERSION, versionBefore);
  assert.equal(SAVE_VERSION, 2);
});
