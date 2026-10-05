import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { ADVENTURE_THEMES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import { createMagicCastleCollectibles, MAGIC_CASTLE_COLLECTIBLE_VISUAL_BUILDERS } from '../src/themes/magic-castle/createMagicCastleCollectibles.js';
import { createMagicCastleLandmarks } from '../src/themes/magic-castle/createMagicCastleLandmarks.js';
import { createMagicCastleScene, magicCastleGroundHeightAt } from '../src/themes/magic-castle/createMagicCastleScene.js';
import { MAGIC_CASTLE_COLLECTIBLE_TYPES } from '../src/themes/magic-castle/magicCastleCollectibleConfig.js';
import { MAGIC_CASTLE_COLLECTIBLES, MAGIC_CASTLE_LANDMARKS, MAGIC_CASTLE_THEME } from '../src/themes/magic-castle/magicCastleConfig.js';
import { MAGIC_CASTLE_QUESTS } from '../src/themes/magic-castle/magicCastleQuestConfig.js';
import { ISLAND_WALKABLE_RADIUS, PLAYER_COLLISION_RADIUS } from '../src/config/gameConfig.js';

test('Magic Castle scene builds a night courtyard, road, lights, ground, target, and idempotent dispose', () => {
  const world = createMagicCastleScene();
  assert.equal(world.scene.name, 'MagicCastleScene');
  assert.ok(world.ground instanceof THREE.Mesh);
  assert.equal(world.ground.name, 'MagicCastleCourtyardGround');
  assert.equal(world.groundHeightAt(-8, 5), 0);
  assert.equal(magicCastleGroundHeightAt(8, -4), 0);
  assert.ok(world.cameraTarget instanceof THREE.Vector3);
  assert.ok(world.scene.fog instanceof THREE.Fog);
  for (const name of ['MagicCastleStoneRoadBase', 'MagicCastleCourtyardWall-1', 'MagicCastleCourtyardCrystal-1', 'MagicCastleNightStar-1', 'MagicCastleMoon']) {
    assert.ok(world.scene.getObjectByName(name), `${name} should be present`);
  }
  assert.ok(world.scene.children.some((object) => object.isLight));
  assert.doesNotThrow(() => world.dispose());
  assert.doesNotThrow(() => world.dispose());
});

test('Magic Castle theme metadata and three landmark definitions use unique named IDs and valid positions', () => {
  assert.equal(MAGIC_CASTLE_THEME.id, THEME_IDS.MAGIC_CASTLE);
  assert.equal(MAGIC_CASTLE_THEME.name, '魔法城堡');
  const theme = ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.MAGIC_CASTLE);
  assert.equal(theme.name, '🏰 魔法城堡');
  assert.deepEqual(MAGIC_CASTLE_LANDMARKS.map(({ id }) => id), ['magic-castle', 'wizard-tower', 'enchanted-garden']);
  assert.equal(new Set(MAGIC_CASTLE_LANDMARKS.map(({ id }) => id)).size, 3);
  assert.ok(MAGIC_CASTLE_LANDMARKS.every(({ name, description, position }) => name && description && Number.isFinite(position.x) && Number.isFinite(position.z)));
});

test('Magic Castle landmark builder creates three distinct interactive landmark models', () => {
  const world = createMagicCastleScene();
  const landmarks = createMagicCastleLandmarks(world.scene, world.groundHeightAt);
  assert.deepEqual(landmarks.map(({ id }) => id), MAGIC_CASTLE_LANDMARKS.map(({ id }) => id));
  for (const landmark of landmarks) {
    assert.ok(landmark.object3D instanceof THREE.Group);
    assert.ok(landmark.object3D.children.length > 0);
    assert.ok(landmark.title && landmark.description && landmark.icon);
    assert.ok(landmark.interactionDistance > 0);
  }
  assert.ok(world.scene.getObjectByName('MagicCastleGreatHall'));
  assert.ok(world.scene.getObjectByName('WizardTowerAstrolabe'));
  assert.ok(world.scene.getObjectByName('EnchantedGardenFountainOrb'));
  const modelSignatures = landmarks.map(({ object3D }) => object3D.children.map(({ type, name }) => `${type}:${name}`).join('|'));
  assert.equal(new Set(modelSignatures).size, 3);
  world.dispose();
});

test('Magic Castle config provides five unique collectible types and fixed valid spawn IDs', () => {
  assert.deepEqual(MAGIC_CASTLE_COLLECTIBLE_TYPES.map(({ id }) => id), ['magic-crystal', 'wizard-scroll', 'enchanted-key', 'fairy-gem', 'magic-potion']);
  assert.deepEqual(MAGIC_CASTLE_COLLECTIBLES.map(({ id }) => id), [
    'magic-collectible-1', 'magic-collectible-2', 'magic-collectible-3', 'magic-collectible-4', 'magic-collectible-5',
  ]);
  assert.equal(new Set(MAGIC_CASTLE_COLLECTIBLE_TYPES.map(({ id }) => id)).size, 5);
  assert.ok(MAGIC_CASTLE_COLLECTIBLE_TYPES.every(({ name, description, icon, visualType }) => name && description && icon && MAGIC_CASTLE_COLLECTIBLE_VISUAL_BUILDERS[visualType]));
  for (const spawn of MAGIC_CASTLE_COLLECTIBLES) {
    assert.ok(Number.isFinite(spawn.position.x) && Number.isFinite(spawn.position.z));
    for (const landmark of MAGIC_CASTLE_LANDMARKS) assert.ok(Math.hypot(spawn.position.x - landmark.position.x, spawn.position.z - landmark.position.z) > 2.5);
  }
  const reachableRadius = ISLAND_WALKABLE_RADIUS - PLAYER_COLLISION_RADIUS;
  for (const id of ['magic-collectible-3', 'magic-collectible-5']) {
    const { position } = MAGIC_CASTLE_COLLECTIBLES.find((spawn) => spawn.id === id);
    assert.ok(Math.hypot(position.x, position.z) < reachableRadius,
      `${id} must lie inside the shared PlayerController movement boundary`);
  }
});

test('Magic Castle collectible builder creates five visible, distinct, positioned scene objects', () => {
  const world = createMagicCastleScene();
  const items = createMagicCastleCollectibles(world.scene, world.groundHeightAt);
  assert.deepEqual(items.map(({ id }) => id), MAGIC_CASTLE_COLLECTIBLES.map(({ id }) => id));
  assert.ok(items.every(({ name, object3D, position }) => name && object3D instanceof THREE.Group && object3D.children.length > 0 && Number.isFinite(position.x) && Number.isFinite(position.z)));
  for (const name of ['MagicCollectibleCrystal', 'WizardScrollParchment', 'EnchantedKeyBow', 'FairyGem', 'MagicPotionBottle']) {
    assert.ok(world.scene.getObjectByName(name), `${name} model should be in the scene`);
  }
  const signatures = items.map(({ object3D }) => object3D.children.map(({ type, name }) => `${type}:${name}`).join('|'));
  assert.equal(new Set(signatures).size, 5);
  world.dispose();
});

test('Magic Castle quest definitions reference exactly the three configured landmarks and five collectibles', () => {
  assert.deepEqual(MAGIC_CASTLE_QUESTS.map(({ id }) => id), ['magic-castle-explorer', 'magic-castle-collector', 'magic-castle-discoverer']);
  assert.equal(new Set(MAGIC_CASTLE_QUESTS.map(({ id }) => id)).size, 3);
  assert.deepEqual(MAGIC_CASTLE_QUESTS.map(({ requiredAmount }) => requiredAmount), [3, 5, 2]);
  assert.ok(MAGIC_CASTLE_QUESTS.every(({ name, description }) => name && description));
  assert.deepEqual(MAGIC_CASTLE_QUESTS[0].objective.landmarkIds, MAGIC_CASTLE_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(MAGIC_CASTLE_QUESTS[1].objective.collectibleIds, MAGIC_CASTLE_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(MAGIC_CASTLE_QUESTS[2].objective.landmarkIds, MAGIC_CASTLE_LANDMARKS.map(({ id }) => id));
});
