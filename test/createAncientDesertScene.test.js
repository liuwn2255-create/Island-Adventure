import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { createAncientDesertScene, ancientDesertGroundHeightAt } from '../src/themes/ancient-desert/createAncientDesertScene.js';

test('Ancient Desert scene has stable sand ground, warm environment, camera target, and safe disposal', () => {
  const desert = createAncientDesertScene();
  assert.ok(desert.scene instanceof THREE.Scene);
  assert.ok(desert.ground instanceof THREE.Mesh);
  assert.equal(desert.ground.name, 'AncientDesertSand');
  assert.equal(desert.groundHeightAt(0, 0), 0);
  assert.equal(ancientDesertGroundHeightAt(4, -3), 0);
  assert.ok(desert.cameraTarget instanceof THREE.Vector3);
  assert.ok(desert.scene.fog instanceof THREE.Fog);
  assert.ok(desert.scene.children.some((object) => object.isLight));
  assert.ok(desert.scene.children.filter((object) => object.name.includes('Dune') || object.name.includes('Rock')).length >= 4);
  assert.doesNotThrow(() => desert.dispose());
  assert.doesNotThrow(() => desert.dispose());
});
