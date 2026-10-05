import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import test from 'node:test';
import { createForestScene } from '../src/themes/forest/createForestScene.js';
import { OCEAN_LANDMARKS } from '../src/themes/ocean/oceanConfig.js';
import { createOceanScene, oceanGroundHeightAt } from '../src/themes/ocean/createOceanScene.js';

test('createOceanScene returns its own scene, target, terrain function, and landmarks', () => {
  const ocean = createOceanScene();
  const forest = createForestScene();
  assert.ok(ocean.scene instanceof THREE.Scene);
  assert.equal(ocean.scene.name, 'DeepOceanExplorationScene');
  assert.ok(ocean.cameraTarget instanceof THREE.Vector3);
  assert.equal(typeof ocean.groundHeightAt, 'function');
  assert.equal(ocean.groundHeightAt, oceanGroundHeightAt);
  assert.deepEqual(ocean.landmarks.map(({ id }) => id), OCEAN_LANDMARKS.map(({ id }) => id));
  assert.notEqual(ocean.scene, forest.scene);
  assert.notEqual(ocean.groundHeightAt, forest.groundHeightAt);
});

test('Ocean seabed has finite gently varied elevations across the walking area and landmarks', () => {
  const samples = [
    [0, 0], [2.5, 1.5], [-3.8, -2.2], [7.5, -2.5],
    ...OCEAN_LANDMARKS.map(({ position }) => [position.x, position.z]),
  ];
  const heights = samples.map(([x, z]) => oceanGroundHeightAt(x, z));
  assert.ok(heights.every(Number.isFinite));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.35);
  assert.ok(Math.max(...heights) - Math.min(...heights) < 1.8);
});

test('Ocean scene has underwater lighting, a non-flat seabed, rocks, vegetation, rays, and rising bubble groups', () => {
  const { scene } = createOceanScene();
  const names = [];
  scene.traverse((object) => names.push(object.name));
  assert.ok(scene.background instanceof THREE.Color);
  assert.ok(scene.fog instanceof THREE.FogExp2);
  assert.ok(names.includes('OceanUndulatingSeabed'));
  assert.ok(names.some((name) => name.startsWith('OceanOutcrop-')));
  assert.ok(names.some((name) => name.startsWith('OceanSeaweedPatch-')));
  assert.ok(names.some((name) => name.startsWith('OceanLightRay-')));
  assert.ok(names.some((name) => name.startsWith('OceanAmbientBubble-')));
  const bubbles = [];
  scene.traverse((object) => { if (object.name.startsWith('OceanAmbientBubble-')) bubbles.push(object); });
  assert.ok(bubbles.length >= 12);
  assert.ok(bubbles.every((bubble) => typeof bubble.onBeforeRender === 'function'));
  assert.ok(new Set(bubbles.map((bubble) => bubble.geometry.parameters.radius)).size > 1);
});

test('Ocean scene does not import or call the Forest scene builder', async () => {
  const source = await readFile(new URL('../src/themes/ocean/createOceanScene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /forest|createForestScene/i);
});
