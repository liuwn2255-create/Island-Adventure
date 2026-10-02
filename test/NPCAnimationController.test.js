import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NPCAnimationController } from '../src/npc/NPCAnimationController.js';

function createClip(name, offset) {
  const track = new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, offset, 0, 0]);
  return new THREE.AnimationClip(name, 1, [track]);
}

test('NPC animation controller cross-fades between Idle and Walk on the visual only', () => {
  const movementRoot = new THREE.Group();
  movementRoot.position.set(4, 2, -3);
  const visual = new THREE.Group();
  movementRoot.add(visual);
  const controller = new NPCAnimationController({
    visual,
    animations: [createClip('Idle', 0.1), createClip('Walk', 0.2), createClip('Run', 0.3), createClip('TPose', 0.4)],
    crossFadeDuration: 0.15,
  });

  assert.equal(controller.currentState, 'idle');
  assert.equal(controller.currentAction.getClip().name, 'Idle');
  assert.equal(controller.setMoving(true), true);
  assert.equal(controller.currentState, 'walk');
  assert.equal(controller.currentAction.getClip().name, 'Walk');
  controller.update(0.2);

  assert.equal(controller.setMoving(false), true);
  assert.equal(controller.currentState, 'idle');
  assert.equal(controller.currentAction.getClip().name, 'Idle');
  controller.update(0.2);
  assert.deepEqual(movementRoot.position.toArray(), [4, 2, -3]);
  assert.equal(controller.currentAction.getClip().name === 'Run', false);
  assert.equal(controller.currentAction.getClip().name === 'TPose', false);

  controller.dispose();
});

test('missing locomotion clips leave the visual controller inactive without moving a root', () => {
  const movementRoot = new THREE.Group();
  const visual = new THREE.Group();
  movementRoot.add(visual);
  const controller = new NPCAnimationController({ visual, animations: [] });

  assert.equal(controller.currentAction, null);
  assert.equal(controller.setMoving(true), false);
  controller.update(0.1);
  assert.deepEqual(movementRoot.position.toArray(), [0, 0, 0]);

  controller.dispose();
});
