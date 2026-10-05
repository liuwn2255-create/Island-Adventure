import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { ANCIENT_DESERT_COLLECTIBLES } from '../src/themes/ancient-desert/ancientDesertConfig.js';
import { ANCIENT_DESERT_COLLECTIBLE_TYPES } from '../src/themes/ancient-desert/ancientDesertCollectibleConfig.js';
import { createAncientDesertScene } from '../src/themes/ancient-desert/createAncientDesertScene.js';
import { ANCIENT_DESERT_COLLECTIBLE_VISUAL_BUILDERS, createAncientDesertCollectibles } from '../src/themes/ancient-desert/createAncientDesertCollectibles.js';

test('Ancient Desert collectible definitions have five unique types and fixed safe spawns', () => {
  assert.deepEqual(ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ id }) => id), [
    'ancient-desert-scarab', 'ancient-desert-gem', 'ancient-desert-coin', 'ancient-desert-tablet', 'ancient-desert-crown',
  ]);
  assert.deepEqual(ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ name }) => name), ['古代聖甲蟲', '沙漠寶石', '古文明金幣', '神秘石板', '古代王冠']);
  assert.equal(new Set(ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ id }) => id)).size, 5);
  assert.ok(ANCIENT_DESERT_COLLECTIBLE_TYPES.every(({ description, collectibleType, visualType }) => description && collectibleType && visualType));
  assert.deepEqual(ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id), [
    'ancient-desert-collectible-1', 'ancient-desert-collectible-2', 'ancient-desert-collectible-3', 'ancient-desert-collectible-4', 'ancient-desert-collectible-5',
  ]);
  assert.equal(new Set(ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id)).size, 5);
  assert.ok(ANCIENT_DESERT_COLLECTIBLES.every(({ position, interactionDistance }) => Number.isFinite(position.x) && Number.isFinite(position.z) && interactionDistance > 0));
  assert.equal(Object.keys(ANCIENT_DESERT_COLLECTIBLE_VISUAL_BUILDERS).length, 5);
});

test('all five Ancient Desert collectibles spawn with distinct 3D visuals and dispose safely', () => {
  const desert = createAncientDesertScene();
  const items = createAncientDesertCollectibles(desert.scene, desert.groundHeightAt);
  assert.equal(items.length, 5);
  assert.deepEqual(items.map(({ type }) => type), ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.deepEqual(items.map(({ name }) => name), ['古代聖甲蟲', '沙漠寶石', '古文明金幣', '神秘石板', '古代王冠']);
  assert.ok(items.every(({ object3D }) => object3D instanceof THREE.Group && object3D.children.some((child) => child.isMesh)));
  assert.equal(new Set(items.map(({ object3D }) => object3D.children.map(({ name }) => name).filter(Boolean).join('|'))).size, 5);
  assert.ok(items.every(({ collected }) => !collected));
  assert.doesNotThrow(() => desert.dispose());
});
