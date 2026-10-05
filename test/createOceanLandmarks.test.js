import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { OCEAN_LANDMARKS } from '../src/themes/ocean/oceanConfig.js';
import { createOceanLandmarks } from '../src/themes/ocean/createOceanLandmarks.js';

test('Ocean landmark builder creates the three configured landmarks with unique IDs and positions', () => {
  const scene = new THREE.Scene();
  const landmarks = createOceanLandmarks(scene, () => -1.2);
  assert.deepEqual(landmarks.map(({ id, name }) => ({ id, name })), [
    { id: 'ocean-reef', name: '珊瑚礁秘境' },
    { id: 'ocean-sunken-ship', name: '沉船遺跡' },
    { id: 'ocean-deep-cave', name: '深海洞穴' },
  ]);
  assert.equal(new Set(landmarks.map(({ id }) => id)).size, 3);
  assert.equal(new Set(landmarks.map(({ position }) => `${position.x},${position.z}`)).size, 3);
  assert.deepEqual(landmarks.map(({ id, position }) => ({ id, x: position.x, z: position.z })), OCEAN_LANDMARKS.map(({ id, position }) => ({ id, x: position.x, z: position.z })));
  assert.ok(landmarks.every(({ object3D }) => object3D instanceof THREE.Object3D));
});

test('reef landmark contains multiple distinct coral, seaweed, rock, and bubble objects', () => {
  const [reef] = createOceanLandmarks(new THREE.Scene(), () => -1.2);
  const names = [];
  reef.object3D.traverse((object) => names.push(object.name));
  assert.ok(names.filter((name) => name.startsWith('OceanCoral')).length >= 12);
  assert.ok(names.filter((name) => name.startsWith('OceanSeaweedBlade')).length >= 6);
  assert.ok(names.filter((name) => name.startsWith('OceanReefRock')).length >= 3);
  assert.ok(names.filter((name) => name.startsWith('OceanBubble')).length >= 3);
  assert.ok(new Set(names.filter((name) => name.startsWith('OceanCoral'))).size > 1);
});

test('sunken ship landmark contains a detailed tilted wreck with ship parts and debris', () => {
  const [, ship] = createOceanLandmarks(new THREE.Scene(), () => -1.2);
  const namedObjects = [];
  const meshes = [];
  ship.object3D.traverse((object) => {
    if (object.name) namedObjects.push(object.name);
    if (object.isMesh) meshes.push(object);
  });
  for (const name of ['ShipHull', 'ShipMast', 'ShipTornSailUpper', 'ShipTornSailLower', 'ShipAnchor', 'ShipCrate-deck-a', 'ShipDeckPlank-1']) {
    assert.ok(namedObjects.includes(name), `missing ${name}`);
  }
  const structure = ship.object3D.getObjectByName('OceanSunkenShipStructure');
  assert.ok(structure.rotation.z !== 0 || structure.rotation.x !== 0);
  assert.ok(meshes.length >= 20);
});

test('deep cave contains dark rock walls, a distinct entrance, crystals, and bubbles', () => {
  const [, , cave] = createOceanLandmarks(new THREE.Scene(), () => -1.2);
  const names = [];
  cave.object3D.traverse((object) => names.push(object.name));
  assert.ok(names.includes('CaveLeftWall'));
  assert.ok(names.includes('CaveRightWall'));
  assert.ok(names.includes('CaveLintelLeft'));
  assert.ok(names.includes('CaveDarkEntrance'));
  assert.ok(names.filter((name) => name.startsWith('CaveGlowCrystal-')).length >= 3);
  assert.ok(names.filter((name) => name.startsWith('OceanBubble')).length >= 2);
});
