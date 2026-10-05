import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import test from 'node:test';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { createDinosaurScene } from '../src/themes/dinosaur/createDinosaurScene.js';
import { createDinosaurLandmarks } from '../src/themes/dinosaur/createDinosaurLandmarks.js';
import { DINOSAUR_LANDMARKS } from '../src/themes/dinosaur/dinosaurConfig.js';

const EXPECTED_LANDMARKS = [
  { id: 'dinosaur-fossil-site', name: '恐龍化石遺跡' },
  { id: 'dinosaur-volcano', name: '史前火山' },
  { id: 'dinosaur-nest', name: '巨型恐龍巢穴' },
];

test('Dinosaur landmark config defines three unique named locations', () => {
  assert.deepEqual(DINOSAUR_LANDMARKS.map(({ id, name }) => ({ id, name })), EXPECTED_LANDMARKS);
  assert.equal(new Set(DINOSAUR_LANDMARKS.map(({ id }) => id)).size, 3);
  assert.equal(new Set(DINOSAUR_LANDMARKS.map(({ position }) => `${position.x},${position.z}`)).size, 3);
  assert.ok(DINOSAUR_LANDMARKS.every(({ description, position }) => (
    typeof description === 'string' && description.trim().length > 0
      && Number.isFinite(position.x) && Number.isFinite(position.z)
  )));
});

test('createDinosaurLandmarks builds all configured landmark objects on the Dinosaur scene', () => {
  const dinosaur = createDinosaurScene();
  const landmarks = createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  assert.equal(landmarks.length, 3);
  assert.deepEqual(landmarks.map(({ id, name }) => ({ id, name })), EXPECTED_LANDMARKS);
  assert.ok(landmarks.every(({ object3D }) => object3D instanceof THREE.Group && object3D.parent === dinosaur.scene));
  assert.ok(landmarks.every(({ title, name }) => title === name));
  for (const landmark of landmarks) {
    assert.equal(landmark.object3D.position.x, landmark.position.x);
    assert.equal(landmark.object3D.position.z, landmark.position.z);
    assert.equal(landmark.object3D.position.y, dinosaur.groundHeightAt(landmark.position.x, landmark.position.z));
  }
  dinosaur.dispose();
});

test('fossil site model contains layered stone, spine, ribs, and a skull', () => {
  const dinosaur = createDinosaurScene();
  const [fossilSite] = createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  const names = [];
  const meshes = [];
  fossilSite.object3D.traverse((object) => {
    if (object.name) names.push(object.name);
    if (object.isMesh) meshes.push(object);
  });
  assert.ok(names.includes('DinosaurFossilSiteFoundation'));
  assert.ok(names.includes('DinosaurFossilSpine'));
  assert.ok(names.some((name) => name.startsWith('DinosaurFossilRib-')));
  assert.ok(names.includes('DinosaurFossilSkull'));
  assert.ok(meshes.length >= 15);
  dinosaur.dispose();
});

test('volcano model has a rocky cone, crater, and static lava glow', () => {
  const dinosaur = createDinosaurScene();
  const [, volcano] = createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  const names = [];
  volcano.object3D.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.includes('DinosaurVolcanoCone'));
  assert.ok(names.includes('DinosaurVolcanoCrater'));
  assert.ok(names.includes('DinosaurVolcanoLavaGlow'));
  assert.ok(names.some((name) => name.startsWith('DinosaurVolcanoBaseRock-')));
  dinosaur.dispose();
});

test('nest model has a bowl, woven twigs, eggs, and surrounding rocks', () => {
  const dinosaur = createDinosaurScene();
  const [, , nest] = createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  const names = [];
  nest.object3D.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.includes('DinosaurNestBowl'));
  assert.equal(names.filter((name) => name.startsWith('DinosaurNestTwig-')).length, 12);
  assert.equal(names.filter((name) => name.startsWith('DinosaurNestEgg-')).length, 3);
  assert.ok(names.some((name) => name.startsWith('DinosaurNestRingRock-')));
  dinosaur.dispose();
});

test('all three Dinosaur landmark models are distinct and renderable Three.js meshes', () => {
  const dinosaur = createDinosaurScene();
  const landmarks = createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  const signatures = landmarks.map((landmark) => {
    const meshes = [];
    landmark.object3D.traverse((object) => { if (object.isMesh) meshes.push(object); });
    assert.ok(meshes.length > 0);
    assert.ok(meshes.every((mesh) => mesh.geometry?.isBufferGeometry && mesh.material));
    return meshes.map(({ geometry }) => geometry.type).sort().join('|');
  });
  assert.equal(new Set(signatures).size, 3);
  dinosaur.dispose();
});

test('Dinosaur scene disposal safely cleans up all attached landmark visuals', () => {
  const dinosaur = createDinosaurScene();
  createDinosaurLandmarks(dinosaur.scene, dinosaur.groundHeightAt);
  assert.doesNotThrow(() => dinosaur.dispose());
  assert.doesNotThrow(() => dinosaur.dispose());
});

test('Dinosaur landmark builder does not depend on or change Save v2', async () => {
  const source = await readFile(new URL('../src/themes/dinosaur/createDinosaurLandmarks.js', import.meta.url), 'utf8');
  assert.equal(SAVE_VERSION, 2);
  assert.doesNotMatch(source, /SaveManager|saveMigration|SAVE_VERSION|localStorage/);
});
