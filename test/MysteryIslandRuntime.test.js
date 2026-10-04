import assert from 'node:assert/strict';
import test from 'node:test';
import { MysteryIslandRuntime } from '../src/adventure/MysteryIslandRuntime.js';

const createAdventure = () => ({ dispose() {}, returnHome() {} });

test('MysteryIslandRuntime can be created with a startAdventure function', () => {
  assert.ok(new MysteryIslandRuntime({ startAdventure() {} }) instanceof MysteryIslandRuntime);
});

test('enter delegates to startAdventure and passes character and restoreData', async () => {
  const character = { id: 'girl-explorer' };
  const restoreData = { themeProgress: { 'mystery-island': { status: 'in-progress' } } };
  const adventure = createAdventure();
  const calls = [];
  const runtime = new MysteryIslandRuntime({
    startAdventure: async (...args) => {
      calls.push(args);
      return adventure;
    },
  });

  const result = await runtime.enter({ character, restoreData });

  assert.deepEqual(calls, [[character, restoreData]]);
  assert.equal(result, adventure);
});

test('enter retains the Adventure instance so exit can delegate its cleanup', async () => {
  let disposeCount = 0;
  const adventure = { dispose() { disposeCount += 1; } };
  const runtime = new MysteryIslandRuntime({ startAdventure: () => adventure });

  assert.equal(await runtime.enter({ character: {}, restoreData: null }), adventure);
  runtime.exit();
  assert.equal(disposeCount, 1);
});

test('exit is safe before enter and repeated exit does not dispose twice', async () => {
  let disposeCount = 0;
  let returnHomeCount = 0;
  const adventure = {
    dispose() { disposeCount += 1; },
    returnHome() { returnHomeCount += 1; },
  };
  const runtime = new MysteryIslandRuntime({ startAdventure: () => adventure });

  assert.doesNotThrow(() => runtime.exit());
  await runtime.enter({ character: {}, restoreData: null });
  runtime.exit();
  runtime.exit();

  assert.equal(disposeCount, 1);
  assert.equal(returnHomeCount, 0);
});

test('Runtime does not implement a second cleanup path or require a disposable result', async () => {
  const runtime = new MysteryIslandRuntime({ startAdventure: () => ({}) });
  await runtime.enter({ character: {}, restoreData: null });
  assert.doesNotThrow(() => runtime.exit());
});

test('constructor rejects a missing startAdventure dependency', () => {
  assert.throws(() => new MysteryIslandRuntime(), {
    name: 'TypeError',
    message: 'startAdventure must be a function',
  });
});
