import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION_TASK_PRIORITY, selectQuestTarget } from '../src/quests/QuestTargetSelector.js';

const taskIds = DIRECTION_TASK_PRIORITY;
const makeTasks = (overrides = {}) => taskIds.map((id) => ({
  id,
  progress: 0,
  completed: false,
  ...(overrides[id] ?? {}),
}));
const target = (id, kind, x, z, isValid = true) => ({
  id, kind, name: id, icon: '•', position: { x, z }, interactionDistance: 1, isValid,
});
const select = ({ tasks = makeTasks(), targetsByTask = {}, playerPosition = { x: 0, z: 0 }, currentLockedTarget = null, currentLockedTargetValid = false } = {}) => selectQuestTarget({
  taskStates: tasks,
  targetsByTask,
  playerPosition,
  currentLockedTarget,
  currentLockedTargetValid,
});

test('1. no progress chooses crystal task by fixed priority', () => {
  const result = select({ targetsByTask: { 'crystal-explorer': [target('crystal-a', 'item', 2, 0)], collector: [target('flower-a', 'item', 1, 0)] } });
  assert.equal(result?.taskId, 'crystal-explorer');
});

test('2. collector progress is prioritized over zero-progress tasks', () => {
  const result = select({
    tasks: makeTasks({ collector: { progress: 2 } }),
    targetsByTask: { 'crystal-explorer': [target('crystal-a', 'item', 1, 0)], collector: [target('flower-a', 'item', 4, 0)] },
  });
  assert.equal(result?.taskId, 'collector');
});

test('3. progressed landmark task wins over progressed collector by fixed order', () => {
  const result = select({
    tasks: makeTasks({ 'island-adventurer': { progress: 1 }, collector: { progress: 2 } }),
    targetsByTask: { 'island-adventurer': [target('camp', 'landmark', 8, 0)], collector: [target('flower-a', 'item', 1, 0)] },
  });
  assert.equal(result?.taskId, 'island-adventurer');
});

test('4. progressed crystal task wins over progressed collector by fixed order', () => {
  const result = select({
    tasks: makeTasks({ 'crystal-explorer': { progress: 1 }, collector: { progress: 2 } }),
    targetsByTask: { 'crystal-explorer': [target('crystal-a', 'item', 8, 0)], collector: [target('flower-a', 'item', 1, 0)] },
  });
  assert.equal(result?.taskId, 'crystal-explorer');
});

test('5. nearest target within one task is selected using X/Z distance', () => {
  const result = select({ targetsByTask: { 'crystal-explorer': [target('crystal-a', 'item', 2, 0), target('crystal-b', 'item', 5, 0)] } });
  assert.equal(result?.id, 'crystal-a');
});

test('6. valid locked target remains selected when another target becomes closer', () => {
  const locked = { ...target('crystal-a', 'item', 8, 0), taskId: 'crystal-explorer' };
  const result = select({
    tasks: makeTasks({ 'crystal-explorer': { progress: 1 } }),
    targetsByTask: { 'crystal-explorer': [target('crystal-b', 'item', 0.5, 0)] },
    currentLockedTarget: locked,
    currentLockedTargetValid: true,
  });
  assert.equal(result, locked);
});

test('7. invalid locked target is replaced by the nearest valid alternative', () => {
  const locked = { ...target('crystal-a', 'item', 8, 0), taskId: 'crystal-explorer' };
  const result = select({
    tasks: makeTasks({ 'crystal-explorer': { progress: 1 } }),
    targetsByTask: { 'crystal-explorer': [target('crystal-b', 'item', 2, 0)] },
    currentLockedTarget: locked,
    currentLockedTargetValid: false,
  });
  assert.equal(result?.id, 'crystal-b');
});

test('8. completed crystal task is excluded', () => {
  const result = select({
    tasks: makeTasks({ 'crystal-explorer': { progress: 3, completed: true } }),
    targetsByTask: { 'crystal-explorer': [target('crystal-a', 'item', 1, 0)], collector: [target('flower-a', 'item', 2, 0)] },
  });
  assert.equal(result?.taskId, 'collector');
});

test('9. collected collectible marked invalid cannot be selected', () => {
  const result = select({
    targetsByTask: { collector: [target('already-collected', 'item', 0.5, 0, false), target('still-uncollected', 'item', 3, 0)] },
  });
  assert.equal(result?.id, 'still-uncollected');
});

test('10. explored landmark marked invalid cannot be selected', () => {
  const result = select({
    tasks: makeTasks({ 'island-adventurer': { progress: 1 } }),
    targetsByTask: { 'island-adventurer': [target('explored-camp', 'landmark', 0.5, 0, false), target('unexplored-stele', 'landmark', 3, 0)] },
  });
  assert.equal(result?.id, 'unexplored-stele');
});

test('11. discovery task only selects undiscovered nature target supplied as valid', () => {
  const result = select({
    tasks: makeTasks({ 'discover-life': { progress: 1 } }),
    targetsByTask: { 'discover-life': [target('butterfly', 'nature', 0.5, 0, false), target('taiwan-tree-frog', 'nature', 3, 0)] },
  });
  assert.equal(result?.id, 'taiwan-tree-frog');
});

test('12. observation task can select an already-discovered creature', () => {
  const result = select({
    tasks: makeTasks({ 'nature-observer': { progress: 1 } }),
    targetsByTask: { 'nature-observer': [target('butterfly', 'nature', 2, 0)] },
  });
  assert.equal(result?.taskId, 'nature-observer');
  assert.equal(result?.id, 'butterfly');
});

test('13. learning task can select an already-discovered creature', () => {
  const result = select({
    tasks: makeTasks({ 'nature-learner': { progress: 1 } }),
    targetsByTask: { 'nature-learner': [target('butterfly', 'nature', 2, 0)] },
  });
  assert.equal(result?.taskId, 'nature-learner');
  assert.equal(result?.id, 'butterfly');
});

test('14. no valid targets returns null', () => {
  const result = select({
    targetsByTask: { 'crystal-explorer': [target('invalid-crystal', 'item', 1, 0, false)], collector: [target('invalid-flower', 'item', 2, 0, false)] },
  });
  assert.equal(result, null);
});

test('15. caller-provided quest order selects targets without Island quest IDs', () => {
  const tasks = [
    { id: 'castle-explorer', progress: 0, completed: false },
    { id: 'castle-collector', progress: 0, completed: false },
  ];
  const result = selectQuestTarget({
    taskStates: tasks,
    taskPriority: ['castle-explorer', 'castle-collector'],
    targetsByTask: {
      'castle-explorer': [target('tower', 'landmark', 4, 0)],
      'castle-collector': [target('gem', 'item', 1, 0)],
    },
  });
  assert.equal(result?.taskId, 'castle-explorer');
  assert.equal(result?.id, 'tower');
});

test('16. caller can preserve configured quest order instead of prioritizing progressed tasks', () => {
  const tasks = makeTasks({
    'crystal-explorer': { progress: 1 },
    collector: { progress: 2 },
  });
  const result = selectQuestTarget({
    taskStates: tasks,
    targetsByTask: {
      'crystal-explorer': [target('crystal-a', 'item', 8, 0)],
      collector: [target('shell-a', 'item', 1, 0)],
    },
    preferProgress: false,
  });
  assert.equal(result?.taskId, 'crystal-explorer');
});
