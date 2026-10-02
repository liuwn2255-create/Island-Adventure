import test from 'node:test';
import assert from 'node:assert/strict';
import { NPCMovement, NPC_MOVEMENT_STATES } from '../src/npc/NPCMovement.js';

function createMovement({ start = { x: 0, z: 0 }, pointA = { x: 3, z: 0 }, ...options } = {}) {
  const group = {
    position: { x: start.x, y: 0, z: start.z },
    rotation: { y: 0 },
  };
  const movement = new NPCMovement({
    group,
    groundHeightAt: (x, z) => x * 0.1 + z * 0.2,
    pointA,
    ...options,
  });
  return { group, movement };
}

test('NPC patrol changes position continuously, follows terrain, and faces its travel direction', () => {
  const { group, movement } = createMovement();
  movement.update(0.5);
  assert.equal(group.position.x, 0.6);
  assert.equal(group.position.z, 0);
  assert.equal(group.position.y, 0.06);
  assert.equal(group.rotation.y, Math.PI / 2);
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WALK_TO_POINT);
});

test('NPC pauses without moving or consuming its stop timer', () => {
  const { group, movement } = createMovement();
  movement.setPaused(true);
  movement.update(1);
  assert.deepEqual(group.position, { x: 0, y: 0, z: 0 });
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WALK_TO_POINT);
  movement.setPaused(false);
  movement.update(0.5);
  assert.equal(group.position.x, 0.6);
});

test('NPC reaches point A, waits, returns to start, waits, and repeats', () => {
  const { group, movement } = createMovement({
    pointA: { x: 3, z: 0 },
    waitAtPoint: 2,
    waitAtStart: 3,
  });
  for (let i = 0; i < 25; i += 1) movement.update(0.1);
  assert.deepEqual({ x: group.position.x, z: group.position.z }, { x: 3, z: 0 });
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WAIT_AT_POINT);

  for (let i = 0; i < 20; i += 1) movement.update(0.1);
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WALK_TO_START);
  for (let i = 0; i < 25; i += 1) movement.update(0.1);
  assert.deepEqual({ x: group.position.x, z: group.position.z }, { x: 0, z: 0 });
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WAIT_AT_START);

  for (let i = 0; i < 30; i += 1) movement.update(0.1);
  assert.equal(movement.state, NPC_MOVEMENT_STATES.WALK_TO_POINT);
});