import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import test from 'node:test';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { createDinosaurScene, dinosaurGroundHeightAt } from '../src/themes/dinosaur/createDinosaurScene.js';

test('createDinosaurScene creates a standalone Three.js scene and a ground mesh', () => {
  const dinosaur = createDinosaurScene();
  assert.ok(dinosaur.scene instanceof THREE.Scene);
  assert.equal(dinosaur.scene.name, 'DinosaurValleyScene');
  assert.ok(dinosaur.ground instanceof THREE.Mesh);
  assert.equal(dinosaur.ground.name, 'DinosaurValleyGround');
  assert.equal(dinosaur.ground.parent, dinosaur.scene);
  dinosaur.dispose();
});

test('Dinosaur ground height is a stable finite value across the walkable area', () => {
  const samples = [[0, 0], [4, -3], [-10, 8], [15, 15]];
  assert.ok(samples.every(([x, z]) => Number.isFinite(dinosaurGroundHeightAt(x, z))));
  assert.deepEqual(samples.map(([x, z]) => dinosaurGroundHeightAt(x, z)), [0, 0, 0, 0]);
});

test('Dinosaur scene provides camera target, atmospheric lighting, background, and environment objects', () => {
  const dinosaur = createDinosaurScene();
  assert.ok(dinosaur.cameraTarget instanceof THREE.Vector3);
  assert.deepEqual(dinosaur.cameraTarget.toArray(), [0, 1, 0]);
  assert.ok(dinosaur.scene.background instanceof THREE.Color);
  assert.ok(dinosaur.scene.fog instanceof THREE.Fog);

  const names = [];
  dinosaur.scene.traverse((object) => names.push(object.name));
  assert.ok(names.includes('DinosaurValleyGround'));
  assert.ok(names.some((name) => name.startsWith('DinosaurRockFormation-')));
  assert.ok(names.some((name) => name.startsWith('DinosaurFern-')));
  assert.ok(dinosaur.scene.children.some((object) => object.isHemisphereLight));
  assert.ok(dinosaur.scene.children.some((object) => object.isDirectionalLight));
  dinosaur.dispose();
});

test('Dinosaur scene cleanup disposes its geometry and materials safely', () => {
  const dinosaur = createDinosaurScene();
  assert.doesNotThrow(() => dinosaur.dispose());
  assert.doesNotThrow(() => dinosaur.dispose());
});

test('Dinosaur scene builder does not depend on or modify Save v2', async () => {
  const source = await readFile(new URL('../src/themes/dinosaur/createDinosaurScene.js', import.meta.url), 'utf8');
  assert.equal(SAVE_VERSION, 2);
  assert.doesNotMatch(source, /SaveManager|saveMigration|SAVE_VERSION|localStorage/);
});
