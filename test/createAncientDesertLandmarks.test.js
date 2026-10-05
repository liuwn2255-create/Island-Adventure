import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { ANCIENT_DESERT_LANDMARKS } from '../src/themes/ancient-desert/ancientDesertConfig.js';
import { createAncientDesertScene } from '../src/themes/ancient-desert/createAncientDesertScene.js';
import { createAncientDesertLandmarks } from '../src/themes/ancient-desert/createAncientDesertLandmarks.js';

test('Ancient Desert has three unique, configured, renderable landmark models', () => {
  const desert = createAncientDesertScene();
  const landmarks = createAncientDesertLandmarks(desert.scene, desert.groundHeightAt);
  assert.deepEqual(landmarks.map(({ id }) => id), ['ancient-desert-temple', 'ancient-desert-oasis', 'ancient-desert-ruins']);
  assert.equal(new Set(landmarks.map(({ id }) => id)).size, 3);
  assert.deepEqual(landmarks.map(({ name }) => name), ['古文明神殿', '沙漠綠洲', '古代遺跡']);
  for (const [index, landmark] of landmarks.entries()) {
    assert.ok(landmark.description);
    assert.ok(Number.isFinite(landmark.position.x) && Number.isFinite(landmark.position.z));
    assert.ok(Number.isFinite(landmark.object3D.position.y));
    assert.ok(landmark.object3D instanceof THREE.Group);
    assert.ok(landmark.object3D.children.some((child) => child.isMesh));
    assert.equal(landmark.position.x, ANCIENT_DESERT_LANDMARKS[index].position.x);
    assert.equal(landmark.position.z, ANCIENT_DESERT_LANDMARKS[index].position.z);
  }
  assert.equal(new Set(landmarks.map(({ object3D }) => object3D.children.map(({ name }) => name).filter(Boolean).join('|'))).size, 3);
  desert.dispose();
});
