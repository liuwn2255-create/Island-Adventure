import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { THEME_IDS, ADVENTURE_THEMES, THEME_COMPLETION_POLICY_TYPES } from '../src/adventure/adventureConfig.js';
import { SPACE_THEME, SPACE_LANDMARKS } from '../src/themes/space/spaceConfig.js';
import { SPACE_COLLECTIBLES, SPACE_COLLECTIBLE_TYPES } from '../src/themes/space/spaceCollectibleConfig.js';
import { SPACE_QUESTS } from '../src/themes/space/spaceQuestConfig.js';
import { createSpaceScene, spaceGroundHeightAt } from '../src/themes/space/createSpaceScene.js';
import { createSpaceLandmarks } from '../src/themes/space/createSpaceLandmarks.js';
import { createSpaceCollectibles, SPACE_COLLECTIBLE_VISUAL_BUILDERS } from '../src/themes/space/createSpaceCollectibles.js';

test('Space scene builds stable exploration ground, starfield, planets, lighting, target, and safe dispose', () => {
  const space = createSpaceScene();
  assert.ok(space.scene instanceof THREE.Scene);
  assert.equal(space.scene.name, 'SpaceAdventureScene');
  assert.ok(space.ground instanceof THREE.Mesh);
  assert.equal(space.groundHeightAt(4, -2), 0);
  assert.equal(spaceGroundHeightAt(-10, 3), 0);
  assert.ok(space.cameraTarget instanceof THREE.Vector3);
  assert.ok(space.scene.fog instanceof THREE.FogExp2);
  assert.ok(space.scene.children.some(({ name }) => name === 'SpaceDistantPlanet'));
  assert.ok(space.scene.children.some(({ name }) => name === 'SpaceDistantMoon'));
  assert.ok(space.scene.children.filter(({ name }) => name.startsWith('SpaceStar-')).length >= 80);
  assert.ok(space.scene.children.some(({ isLight }) => isLight));
  assert.doesNotThrow(() => space.dispose());
  assert.doesNotThrow(() => space.dispose());
});

test('Space theme and three landmarks use the requested IDs and build distinct models', () => {
  assert.equal(SPACE_THEME.id, THEME_IDS.SPACE);
  assert.deepEqual(SPACE_LANDMARKS.map(({ id }) => id), ['space-station', 'alien-planet', 'space-observatory']);
  const space = createSpaceScene();
  const landmarks = createSpaceLandmarks(space.scene, space.groundHeightAt);
  assert.equal(landmarks.length, 3);
  assert.equal(new Set(landmarks.map(({ id }) => id)).size, 3);
  assert.deepEqual(landmarks.map(({ name }) => name), ['太空站', '神秘外星行星', '太空觀測站']);
  for (const landmark of landmarks) {
    assert.ok(landmark.description);
    assert.ok(Number.isFinite(landmark.position.x) && Number.isFinite(landmark.position.z));
    assert.ok(landmark.object3D instanceof THREE.Group);
    assert.ok(landmark.object3D.children.some(({ isMesh }) => isMesh));
    assert.ok(landmark.interactionDistance > 0);
  }
  assert.equal(new Set(landmarks.map(({ object3D }) => object3D.children.map(({ name }) => name).join('|'))).size, 3);
  space.dispose();
});

test('Space has five configured collectible types and fixed unique spawn IDs with distinct visuals', () => {
  assert.deepEqual(SPACE_COLLECTIBLES.map(({ id }) => id), [
    'space-collectible-1', 'space-collectible-2', 'space-collectible-3', 'space-collectible-4', 'space-collectible-5',
  ]);
  assert.deepEqual(SPACE_COLLECTIBLE_TYPES.map(({ id }) => id), [
    'space-crystal', 'space-star', 'space-metal', 'space-artifact', 'space-capsule',
  ]);
  assert.equal(new Set(SPACE_COLLECTIBLES.map(({ id }) => id)).size, 5);
  assert.ok(SPACE_COLLECTIBLE_TYPES.every(({ name, description, visualType }) => name && description && SPACE_COLLECTIBLE_VISUAL_BUILDERS[visualType]));
  for (const spawn of SPACE_COLLECTIBLES) {
    assert.ok(Number.isFinite(spawn.position.x) && Number.isFinite(spawn.position.z));
    assert.ok(spawn.interactionDistance > 0);
    for (const landmark of SPACE_LANDMARKS) assert.ok(Math.hypot(spawn.position.x - landmark.position.x, spawn.position.z - landmark.position.z) > 2.5);
  }
  const space = createSpaceScene();
  const items = createSpaceCollectibles(space.scene, space.groundHeightAt);
  assert.equal(items.length, 5);
  assert.ok(items.every(({ object3D }) => object3D instanceof THREE.Group && object3D.children.some(({ isMesh }) => isMesh)));
  assert.equal(new Set(items.map(({ object3D }) => object3D.children.map(({ name }) => name).join('|'))).size, 5);
  space.dispose();
});

test('Space quests reference the requested landmarks and collectible spawns used by completion policy', () => {
  assert.deepEqual(SPACE_QUESTS.map(({ id }) => id), ['space-explorer', 'space-collector', 'space-discoverer']);
  assert.deepEqual(SPACE_QUESTS.map(({ requiredAmount }) => requiredAmount), [3, 5, 2]);
  assert.ok(SPACE_QUESTS.every(({ name, description }) => name && description));
  assert.deepEqual(SPACE_QUESTS[0].objective.landmarkIds, SPACE_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(SPACE_QUESTS[1].objective.collectibleIds, SPACE_COLLECTIBLES.map(({ id }) => id));
  const theme = ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.SPACE);
  assert.equal(theme.completionPolicy.type, THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS);
  assert.deepEqual(theme.completionPolicy.questIds, ['space-explorer', 'space-collector', 'space-discoverer']);
  assert.deepEqual(theme.completionPolicy.questIds, SPACE_QUESTS.map(({ id }) => id));
  assert.deepEqual(SPACE_THEME.completionPolicy, theme.completionPolicy);
});
