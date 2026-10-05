import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { createOceanCollectibles } from '../src/themes/ocean/createOceanCollectibles.js';
import { OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES } from '../src/themes/ocean/oceanConfig.js';
import { createOceanScene } from '../src/themes/ocean/createOceanScene.js';

test('Ocean coral, gem, and mysterious scale use distinct recognizable Ocean-only models', () => {
  const scene = new THREE.Scene();
  const items = createOceanCollectibles(scene, () => 0);
  try {
    assert.deepEqual(OCEAN_COLLECTIBLE_TYPES.map(({ id }) => id), [
      'ocean-deep-pearl', 'ocean-coral', 'ocean-deep-gem', 'ocean-sunken-treasure', 'ocean-mysterious-scale',
    ]);
    assert.deepEqual(OCEAN_COLLECTIBLES.map(({ id }) => id), items.map(({ id }) => id));

    const meshes = (id) => {
      const result = [];
      items.find((item) => item.id === id).object3D.traverse((object) => { if (object.isMesh) result.push(object); });
      return result;
    };
    const coralNames = meshes('ocean-collectible-2').map(({ name }) => name);
    assert.ok(coralNames.includes('OceanCoralTrunk'));
    assert.ok(coralNames.filter((name) => name.includes('Fork') || name.includes('Twig')).length >= 5);
    assert.ok(!coralNames.some((name) => name.toLowerCase().includes('flower')));

    const gemNames = meshes('ocean-collectible-3').map(({ name }) => name);
    assert.ok(gemNames.includes('OceanGemGirdle'));
    assert.ok(gemNames.includes('OceanGemCrownFacets'));
    assert.ok(gemNames.includes('OceanGemPavilionFacets'));
    assert.ok(gemNames.includes('OceanGemHighlight'));

    const scaleNames = meshes('ocean-collectible-5').map(({ name }) => name);
    assert.equal(scaleNames.filter((name) => name.startsWith('OceanFishScale-') && !name.endsWith('-ridge')).length, 5);
    assert.ok(scaleNames.some((name) => name === 'OceanFishScale-1-ridge'));
    const scaleItem = items.find(({ id }) => id === 'ocean-collectible-5');
    const scaleBox = new THREE.Box3().setFromObject(scaleItem.object3D);
    assert.ok(scaleBox.max.y - scaleItem.position.y > 1.25, 'upright scales should rise clearly above the seabed');
    assert.ok(gemNames.includes('OceanGemDisplayStone'));
    assert.ok(gemNames.includes('OceanGemTreasureHalo'));

    const reef = { x: 0, z: 6 };
    const ship = { x: 5, z: 0 };
    const scaleSpawn = OCEAN_COLLECTIBLES.find(({ type }) => type === 'ocean-mysterious-scale');
    const gemSpawn = OCEAN_COLLECTIBLES.find(({ type }) => type === 'ocean-deep-gem');
    assert.ok(Math.hypot(scaleSpawn.position.x - reef.x, scaleSpawn.position.z - reef.z) > 3.5, 'scales need clear separation from reef landmark');
    assert.ok(Math.hypot(gemSpawn.position.x - ship.x, gemSpawn.position.z - ship.z) > 5, 'gem needs clear separation from wreck landmark');
  } finally {
    for (const item of items) item.object3D.traverse((object) => {
      object.geometry?.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
    });
  }
});

test('Ocean distant ridge geometry stays outside the reachable third-person camera orbit', () => {
  const { scene } = createOceanScene();
  try {
    scene.updateMatrixWorld(true);
    const cameraOrbitRadius = 10.55 - 0.55 + Math.hypot(3.2, 7.2);
    const ridges = [];
    scene.traverse((object) => { if (object.name.startsWith('OceanDistantRidge-')) ridges.push(object); });
    assert.equal(ridges.length, 22);
    for (const ridge of ridges) {
      const bounds = new THREE.Box3().setFromObject(ridge);
      const horizontalCenterRadius = Math.hypot(ridge.position.x, ridge.position.z);
      const horizontalHalfDiagonal = Math.hypot((bounds.max.x - bounds.min.x) / 2, (bounds.max.z - bounds.min.z) / 2);
      assert.ok(horizontalCenterRadius - horizontalHalfDiagonal > cameraOrbitRadius,
        `${ridge.name} must not intersect camera positions reachable from the player boundary`);
    }
  } finally {
    scene.traverse((object) => {
      object.geometry?.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
    });
  }
});
