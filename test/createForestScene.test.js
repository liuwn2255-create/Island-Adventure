import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createForestScene } from '../src/themes/forest/createForestScene.js';

const sceneSource = readFileSync(new URL('../src/themes/forest/createForestScene.js', import.meta.url), 'utf8');

test('createForestScene creates a standalone Three.js scene without browser DOM', () => {
  const forest = createForestScene();
  assert.equal(forest.scene.isScene, true);
  assert.equal(forest.scene.name, 'MysteryForestScene');
  assert.ok(forest.scene.children.some((child) => child.isMesh));
  assert.ok(forest.landmarks.length > 0);
});

test('Forest scene provides a camera target and finite gentle ground heights', () => {
  const forest = createForestScene();
  assert.ok(forest.cameraTarget.isVector3);
  assert.equal(typeof forest.groundHeightAt, 'function');
  const heights = [[0, 0], [3, 2], [-7, 5]].map(([x, z]) => forest.groundHeightAt(x, z));
  assert.ok(heights.every(Number.isFinite));
  assert.ok(Math.max(...heights) - Math.min(...heights) < 0.12);
});

test('Forest scene does not import Mystery Island scene or terrain builders', () => {
  assert.doesNotMatch(sceneSource, /createIslandScene|createTerrain/);
});
