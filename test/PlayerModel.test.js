import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import test from 'node:test';
import { PlayerController } from '../src/player/PlayerController.js';
import { PlayerAnimationController, loadPlayerModel } from '../src/player/PlayerModel.js';

const modelUrl = new URL('../public/assets/models/Meshy_AI_Little_Explorer_All_Animations.glb', import.meta.url);

function readGlbJson(buffer) {
  assert.equal(buffer.subarray(0, 4).toString(), 'glTF');
  assert.equal(buffer.readUInt32LE(4), 2);
  for (let offset = 12; offset < buffer.length;) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    if (chunkType === 0x4e4f534a) return JSON.parse(buffer.toString('utf8', offset, offset + chunkLength));
    offset += chunkLength;
  }
  throw new Error('GLB JSON chunk is missing');
}

test('Tracy Meshy GLB contains a skinned explorer mesh and named Walking/Running clips', async () => {
  const glb = await readFile(modelUrl);
  const document = readGlbJson(glb);
  assert.equal(document.asset.version, '2.0');
  assert.ok(document.meshes.some(({ name }) => name === 'output_unwrapped'));
  assert.equal(document.skins.length, 1);
  assert.equal(document.skins[0].joints.length, 66);
  const jointNames = new Set(document.skins[0].joints.map((index) => document.nodes[index]?.name));
  for (const name of ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:LeftFoot', 'mixamorig:RightFoot']) assert.ok(jointNames.has(name));
  assert.deepEqual(document.animations.map(({ name }) => name), ['Running', 'Walking']);
  for (const animation of document.animations) assert.ok(animation.channels.length > 100);
});

test('loadPlayerModel falls back to the original player asset if Meshy cannot load', async () => {
  const attempted = [];
  const fallbackScene = new THREE.Group();
  fallbackScene.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.4), new THREE.MeshStandardMaterial()));
  const visual = await loadPlayerModel('/meshy.glb', {
    fallbackPath: '/assets/characters/player/player.glb',
    loaderFactory: () => ({
      load(path, onLoad, _onProgress, onError) {
        attempted.push(path);
        queueMicrotask(() => path === '/meshy.glb'
          ? onError(new Error('Meshy request failed'))
          : onLoad({ scene: fallbackScene, animations: [] }));
      },
    }),
  });
  assert.deepEqual(attempted, ['/meshy.glb', '/assets/characters/player/player.glb']);
  assert.equal(visual.name, 'PlayerModelVisual');
  assert.ok(visual.getObjectByName('PlayerModelFit'));
  assert.ok(visual.userData.playerAnimationController instanceof PlayerAnimationController);
  visual.userData.playerAnimationController.dispose();
});

test('PlayerAnimationController plays the Meshy Walking clip for locomotion and can stop cleanly', () => {
  const root = new THREE.Group();
  const hips = new THREE.Bone();
  hips.name = 'Hips';
  root.add(hips);
  const walking = new THREE.AnimationClip('Walking', 1, [
    new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, 0, 0, 0, 0.3, 0]),
  ]);
  const running = new THREE.AnimationClip('Running', 1, []);
  const animation = new PlayerAnimationController(root, [running, walking]);
  animation.setMoving(true);
  animation.update(0.5);
  assert.equal(animation.currentAction, animation.walkAction);
  assert.ok(hips.position.y > 0);
  animation.setMoving(false);
  assert.equal(animation.currentAction, null, 'without an Idle clip, the locomotion clip stops while standing');
  animation.dispose();
});

test('PlayerController drives an attached visual animator without changing camera-relative movement', () => {
  const priorWindow = globalThis.window;
  const listeners = new Map();
  globalThis.window = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
  const scene = new THREE.Scene();
  const player = new PlayerController(scene, { groundHeightAt: () => 0, getCameraForward: () => new THREE.Vector3(0, 0, -1) });
  const states = [];
  let animationDisposed = 0;
  const visual = new THREE.Group();
  visual.userData.playerAnimationController = {
    setMoving(moving) { states.push(moving); },
    update() {},
    dispose() { animationDisposed += 1; },
  };
  player.object3D.add(visual);
  try {
    const start = player.object3D.position.clone();
    listeners.get('keydown')({ code: 'KeyW', preventDefault() {} });
    player.update(0.25);
    assert.ok(player.object3D.position.z < start.z);
    assert.equal(states.at(-1), true);
    listeners.get('keyup')({ code: 'KeyW', preventDefault() {} });
    player.update(0.25);
    assert.equal(states.at(-1), false);
    player.dispose();
    assert.equal(animationDisposed, 1);
  } finally {
    globalThis.window = priorWindow;
  }
});
