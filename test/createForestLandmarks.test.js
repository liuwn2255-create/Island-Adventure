import assert from 'node:assert/strict';
import test from 'node:test';
import { FOREST_LANDMARKS } from '../src/themes/forest/forestConfig.js';
import { createForestLandmarks } from '../src/themes/forest/createForestLandmarks.js';
import { forestGroundHeightAt, createForestScene } from '../src/themes/forest/createForestScene.js';

const EXPECTED_IDS = ['forest-entrance', 'forest-stream', 'forest-mysterious-rock'];

test('Forest landmark builder creates all configured unique Forest landmark IDs', () => {
  const { scene } = createForestScene();
  const landmarks = createForestLandmarks(scene, forestGroundHeightAt);
  const ids = landmarks.map(({ id }) => id);
  assert.deepEqual(ids, FOREST_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(ids, EXPECTED_IDS);
  assert.equal(new Set(ids).size, ids.length);
});

test('each Forest landmark has a distinct visible Three.js model at its configured position', () => {
  const { scene } = createForestScene();
  const landmarks = createForestLandmarks(scene, forestGroundHeightAt);
  for (const landmark of landmarks) {
    assert.ok(landmark.object3D.isGroup);
    assert.ok(landmark.object3D.children.length > 0);
    assert.equal(landmark.title, landmark.name);
    assert.equal(landmark.object3D.position.x, landmark.position.x);
    assert.equal(landmark.object3D.position.z, landmark.position.z);
  }
});

test('Forest landmarks use an independent builder and leave Mystery Island builder untouched', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/themes/forest/createForestLandmarks.js', import.meta.url), 'utf8',
  ));
  assert.doesNotMatch(source, /createLandmarks\.js/);
  assert.match(source, /forest-entrance/);
  assert.match(source, /forest-stream/);
  assert.match(source, /forest-mysterious-rock/);
});
