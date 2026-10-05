import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import test from 'node:test';
import { SAVE_STORAGE_KEY, SAVE_VERSION } from '../src/save/saveConfig.js';
import { SaveManager } from '../src/save/SaveManager.js';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { DinosaurRuntime } from '../src/themes/dinosaur/DinosaurRuntime.js';
import { BadgeManager } from '../src/badges/BadgeManager.js';
import { DINOSAUR_COLLECTIBLES, DINOSAUR_COLLECTIBLE_TYPES } from '../src/themes/dinosaur/dinosaurCollectibleConfig.js';
import { DINOSAUR_LANDMARKS } from '../src/themes/dinosaur/dinosaurConfig.js';
import { DINOSAUR_QUESTS } from '../src/themes/dinosaur/dinosaurQuestConfig.js';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.classList = { add() {}, remove() {} };
    this.queries = new Map();
    this.parentNode = null;
    this.hidden = false;
  }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) {
    if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div'));
    return this.queries.get(selector);
  }
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ preventDefault() {} }); }
  focus() {}
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
    this.parentNode = null;
  }
}

class FakeWindow {
  innerWidth = 1000;
  innerHeight = 720;
  devicePixelRatio = 1;
  listeners = new Map();
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  listenerCount(type) { return this.listeners.get(type)?.size ?? 0; }
  dispatch(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  matchMedia() { return { matches: false }; }
  setTimeout(...args) { return globalThis.setTimeout(...args); }
  clearTimeout(id) { globalThis.clearTimeout(id); }
}

class FakeRenderer {
  constructor() {
    this.domElement = new FakeElement('canvas');
    this.shadowMap = {};
    this.loop = null;
    this.disposeCount = 0;
  }
  setPixelRatio() {}
  setSize() {}
  render() {}
  setAnimationLoop(callback) { this.loop = callback; }
  dispose() { this.disposeCount += 1; }
}

class MemoryStorage {
  constructor(value = null) { this.value = value; }
  getItem() { return this.value; }
  setItem(_key, value) { this.value = value; }
  removeItem() { this.value = null; }
}

function createIslandProgress() {
  const progress = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) progress[field] = {};
  return progress;
}

function createSave({ dinosaur = null, forest = null, ocean = null, other = null, island = createIslandProgress() } = {}) {
  return {
    version: SAVE_VERSION,
    characterId: 'dinosaur-explorer',
    themeProgress: {
      [THEME_IDS.MYSTERY_ISLAND]: island,
      ...(forest ? { [THEME_IDS.FOREST]: forest } : {}),
      ...(ocean ? { [THEME_IDS.OCEAN]: ocean } : {}),
      ...(other ? { [THEME_IDS.MAGIC_CASTLE]: other } : {}),
      ...(dinosaur ? { [THEME_IDS.DINOSAUR]: dinosaur } : {}),
    },
  };
}

async function withBrowser(run) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fakeWindow = new FakeWindow();
  const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: 0 } });
  try { return await run({ window: fakeWindow, document: fakeDocument }); }
  finally {
    for (const [key, descriptor] of [['window', oldWindow], ['document', oldDocument], ['navigator', oldNavigator]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

function createFixture({ saveData = null, storage = null } = {}) {
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  const testStorage = storage ?? new MemoryStorage(saveData ? JSON.stringify(saveData) : null);
  const saveManager = new SaveManager({ storage: testStorage, debounceMs: 60000 });
  const controls = { disposeCount: 0, dispose() { this.disposeCount += 1; } };
  const inventoryUI = { disposed: false, dispose() { this.disposed = true; } };
  const runtime = new DinosaurRuntime({
    rendererFactory: () => renderer,
    mobileControlsFactory: () => controls,
    inventoryUIFactory: (options) => { inventoryUI.options = options; return inventoryUI; },
    playerModelLoader: async () => new THREE.Group(),
    clockFactory: () => ({ getDelta: () => 1 / 30 }),
  });
  let returned = 0;
  return {
    app,
    renderer,
    controls,
    inventoryUI,
    storage: testStorage,
    saveManager,
    runtime,
    enter: (window, document) => runtime.enter({
      app,
      character: { id: 'dinosaur-explorer', modelPath: '/player.glb' },
      restoreData: saveData,
      saveManager,
      window,
      document,
      onBack: () => { returned += 1; },
    }),
    get returned() { return returned; },
    cleanup: () => { runtime.exit(); saveManager.clearSave(); },
  };
}

function pressE(window) {
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
}

function savedData(fixture) {
  assert.ok(fixture.storage.value, 'Save v2 should have been written');
  return JSON.parse(fixture.storage.value);
}

function interactWithLandmark(runtime, window, landmark) {
  runtime.player.object3D.position.set(landmark.position.x, runtime.groundHeightAt(landmark.position.x, landmark.position.z), landmark.position.z);
  runtime.interactionManager.update();
  pressE(window);
  runtime.interactionManager.closeDialog();
}

function interactWithItem(runtime, window, item) {
  runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  runtime.interactionManager.update();
  pressE(window);
}

function completeAllDinosaurQuests(runtime, window) {
  for (const landmark of runtime.landmarks) interactWithLandmark(runtime, window, landmark);
  for (const item of runtime.items) interactWithItem(runtime, window, item);
}

async function createCompletedDinosaurSave(window, document) {
  const fixture = createFixture();
  await fixture.enter(window, document);
  completeAllDinosaurQuests(fixture.runtime, window);
  fixture.runtime.returnButton.click();
  const data = structuredClone(savedData(fixture));
  fixture.cleanup();
  return data;
}

test('DinosaurRuntime creates Dinosaur scene, renderer, player, camera, and mobile controls with Save v2 support but no audio manager', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.equal(fixture.runtime.scene.name, 'DinosaurValleyScene');
  assert.ok(fixture.runtime.camera instanceof THREE.PerspectiveCamera);
  assert.ok(fixture.runtime.player.object3D);
  assert.equal(fixture.runtime.player.enabled, true);
  assert.equal(fixture.runtime.player.groundHeightAt, fixture.runtime.groundHeightAt);
  assert.ok(fixture.runtime.cameraTarget);
  assert.ok(fixture.controls);
  assert.equal(fixture.runtime.saveManager, fixture.saveManager);
  assert.equal(fixture.runtime.audioManager, undefined);
  assert.equal(SAVE_VERSION, 2);
  assert.ok(fixture.renderer.loop);
  fixture.cleanup();
}));

test('DinosaurRuntime creates all configured landmarks, collectibles, and quests', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.deepEqual(fixture.runtime.landmarks.map(({ id }) => id), DINOSAUR_LANDMARKS.map(({ id }) => id));
  assert.ok(fixture.runtime.landmarks.every(({ object3D, interactionDistance }) => object3D.children.length > 0 && interactionDistance > 0));
  assert.deepEqual(fixture.runtime.items.map(({ id }) => id), DINOSAUR_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(fixture.runtime.inventoryManager.types.map(({ id }) => id), DINOSAUR_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.ok(fixture.runtime.items.every(({ object3D }) => object3D.children.some((child) => child.isMesh)));
  assert.deepEqual(fixture.runtime.getQuestSnapshot().map(({ id }) => id), DINOSAUR_QUESTS.map(({ id }) => id));
  assert.ok(fixture.runtime.getQuestSnapshot().every(({ progress, completed }) => progress === 0 && !completed));
  fixture.cleanup();
}));

test('DinosaurRuntime enables WASD movement and camera follow', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const start = fixture.runtime.player.object3D.position.clone();
  window.dispatch('keydown', { code: 'KeyW', preventDefault() {} });
  fixture.runtime.frame();
  window.dispatch('keyup', { code: 'KeyW', preventDefault() {} });
  assert.notDeepEqual(fixture.runtime.player.object3D.position.toArray(), start.toArray());
  fixture.cleanup();
}));

test('E explores Dinosaur landmarks, shows the configured description, and repeated exploration counts once', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  fixture.runtime.interactionManager.update();
  assert.equal(fixture.runtime.interactionManager.prompt.hidden, false);
  pressE(window);
  assert.equal(fixture.runtime.interactionManager.activeLandmark.id, landmark.id);
  assert.equal(fixture.runtime.interactionManager.backdrop.querySelector('[data-dialog-title]').textContent, landmark.name);
  assert.equal(fixture.runtime.interactionManager.backdrop.querySelector('[data-dialog-description]').textContent, landmark.description);
  assert.equal(fixture.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-explorer').progress, 1);
  fixture.runtime.interactionManager.closeDialog();
  pressE(window);
  assert.equal(fixture.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-explorer').progress, 1);
  assert.deepEqual([...fixture.runtime.questManager.exploredLandmarkIds], [landmark.id]);
  fixture.cleanup();
}));

test('Dinosaur landmark events advance explorer and discoverer according to their targets', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  for (const landmark of fixture.runtime.landmarks.slice(0, 2)) {
    fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
    fixture.runtime.interactionManager.update();
    pressE(window);
    fixture.runtime.interactionManager.closeDialog();
  }
  let snapshot = fixture.runtime.getQuestSnapshot();
  assert.equal(snapshot.find(({ id }) => id === 'dinosaur-explorer').progress, 2);
  assert.equal(snapshot.find(({ id }) => id === 'dinosaur-discoverer').progress, 2);
  assert.equal(snapshot.find(({ id }) => id === 'dinosaur-discoverer').completed, true);
  const third = fixture.runtime.landmarks[2];
  fixture.runtime.player.object3D.position.set(third.position.x, 0, third.position.z);
  fixture.runtime.interactionManager.update();
  pressE(window);
  snapshot = fixture.runtime.getQuestSnapshot();
  assert.equal(snapshot.find(({ id }) => id === 'dinosaur-explorer').progress, 3);
  assert.equal(snapshot.find(({ id }) => id === 'dinosaur-explorer').completed, true);
  fixture.cleanup();
}));

test('E picks up Dinosaur collectibles once and advances the collector quest', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const item = fixture.runtime.items[0];
  fixture.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  fixture.runtime.interactionManager.update();
  assert.equal(fixture.runtime.interactionManager.prompt.hidden, false);
  pressE(window);
  assert.equal(item.object3D.visible, false);
  assert.equal(item.collected, true);
  assert.equal(fixture.runtime.interactionManager.toast.textContent, `✨ 已取得：${item.name}`);
  assert.equal(fixture.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-collector').progress, 1);
  assert.equal(fixture.runtime.inventoryManager.getCount(item.type), 1);
  pressE(window);
  assert.equal(fixture.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-collector').progress, 1);
  assert.equal(fixture.runtime.inventoryManager.getCount(item.type), 1);
  assert.deepEqual([...fixture.runtime.questManager.collectedItemIds], [item.id]);
  assert.equal(fixture.inventoryUI.options.inventory, fixture.runtime.inventoryManager);
  fixture.cleanup();
}));

test('return button calls Adventure World callback and cleans runtime resources', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const canvas = fixture.renderer.domElement;
  fixture.runtime.returnButton.click();
  assert.equal(fixture.returned, 1);
  assert.equal(fixture.runtime.isActive, false);
  assert.equal(fixture.renderer.loop, null);
  assert.equal(fixture.renderer.disposeCount, 1);
  assert.equal(fixture.controls.disposeCount, 1);
  assert.equal(canvas.parentNode, null);
  assert.equal(fixture.runtime.interactionManager, null);
  assert.equal(fixture.runtime.scene, null);
  assert.equal(fixture.runtime.returnButton, null);
  assert.equal(fixture.inventoryUI.disposed, true);
  assert.equal(fixture.runtime.inventoryManager, null);
  assert.equal(window.listenerCount('resize'), 0);
  fixture.saveManager.clearSave();
}));

test('leaving a new Dinosaur game creates only a valid Dinosaur v2 bucket with initial state and player position', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  fixture.runtime.player.object3D.position.set(2, 0, 3);
  const rotationY = fixture.runtime.player.object3D.rotation.y;
  fixture.runtime.returnButton.click();
  const saved = savedData(fixture);
  const dinosaur = saved.themeProgress[THEME_IDS.DINOSAUR];
  assert.equal(saved.version, 2);
  assert.equal(dinosaur.status, THEME_STATUSES.IN_PROGRESS);
  assert.deepEqual(dinosaur.quests.progress, Object.fromEntries(DINOSAUR_QUESTS.map(({ id }) => [id, 0])));
  assert.deepEqual(dinosaur.quests.completed, []);
  assert.deepEqual(dinosaur.collections.collectedItemIds, []);
  assert.deepEqual(dinosaur.world.player, { x: 2, z: 3, rotationY });
  assert.equal(fixture.returned, 1);
  fixture.cleanup();
}));

test('explored Dinosaur landmark IDs and explorer progress are saved to Dinosaur only', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  interactWithLandmark(fixture.runtime, window, landmark);
  fixture.runtime.returnButton.click();
  const saved = savedData(fixture);
  assert.deepEqual(saved.themeProgress[THEME_IDS.DINOSAUR].quests.exploredLandmarkIds, [landmark.id]);
  assert.equal(saved.themeProgress[THEME_IDS.DINOSAUR].quests.progress['dinosaur-explorer'], 1);
  assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], createIslandProgress());
  fixture.cleanup();
}));

test('collected Dinosaur item IDs and collector progress are saved', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const item = fixture.runtime.items[0];
  interactWithItem(fixture.runtime, window, item);
  fixture.runtime.returnButton.click();
  const dinosaur = savedData(fixture).themeProgress[THEME_IDS.DINOSAUR];
  assert.deepEqual(dinosaur.collections.collectedItemIds, [item.id]);
  assert.deepEqual(dinosaur.quests.collectedItemIds, [item.id]);
  assert.equal(dinosaur.quests.progress['dinosaur-collector'], 1);
  fixture.cleanup();
}));

test('Dinosaur quest progress and completed state are saved from the existing QuestManager', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  for (const landmark of fixture.runtime.landmarks.slice(0, 2)) interactWithLandmark(fixture.runtime, window, landmark);
  fixture.runtime.returnButton.click();
  const quests = savedData(fixture).themeProgress[THEME_IDS.DINOSAUR].quests;
  assert.equal(quests.progress['dinosaur-explorer'], 2);
  assert.equal(quests.progress['dinosaur-discoverer'], 2);
  assert.ok(quests.completed.includes('dinosaur-discoverer'));
  fixture.cleanup();
}));

test('Dinosaur player position and rotation are saved', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  fixture.runtime.player.object3D.position.set(-3, 0, 4);
  fixture.runtime.player.object3D.rotation.y = 1.25;
  fixture.runtime.returnButton.click();
  assert.deepEqual(savedData(fixture).themeProgress[THEME_IDS.DINOSAUR].world.player, { x: -3, z: 4, rotationY: 1.25 });
  fixture.cleanup();
}));

test('Dinosaur Save v2 re-entry restores quests, explored landmarks, collected items, and player position without recounting', async () => withBrowser(async ({ window, document }) => {
  const first = createFixture();
  await first.enter(window, document);
  const landmark = first.runtime.landmarks[0];
  const item = first.runtime.items[0];
  interactWithLandmark(first.runtime, window, landmark);
  interactWithItem(first.runtime, window, item);
  first.runtime.player.object3D.position.set(4, 0, 2);
  first.runtime.player.object3D.rotation.y = 0.6;
  first.runtime.returnButton.click();

  const restored = createFixture({ storage: first.storage });
  await restored.enter(window, document);
  assert.deepEqual([...restored.runtime.questManager.exploredLandmarkIds], [landmark.id]);
  assert.deepEqual([...restored.runtime.questManager.collectedItemIds], [item.id]);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-explorer').progress, 1);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-collector').progress, 1);
  assert.equal(restored.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  assert.equal(restored.runtime.inventoryManager.getCount(item.type), 1);
  assert.deepEqual(restored.runtime.player.object3D.position.toArray(), [4, 0, 2]);
  assert.equal(restored.runtime.player.object3D.rotation.y, 0.6);
  interactWithLandmark(restored.runtime, window, landmark);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'dinosaur-explorer').progress, 1);
  assert.equal(restored.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  restored.cleanup();
}));

test('saving Dinosaur progress preserves the Mystery Island bucket exactly', async () => withBrowser(async ({ window, document }) => {
  const island = createIslandProgress();
  island.quests = { progress: { collector: 2 }, completed: ['collector'] };
  island.world = { player: { x: 6, z: 1 } };
  const fixture = createFixture({ saveData: createSave({ island }) });
  await fixture.enter(window, document);
  fixture.runtime.returnButton.click();
  assert.deepEqual(savedData(fixture).themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  fixture.cleanup();
}));

test('saving Dinosaur progress preserves the Forest bucket exactly', async () => withBrowser(async ({ window, document }) => {
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), quests: { progress: { 'forest-explorer': 2 } } };
  const fixture = createFixture({ saveData: createSave({ forest }) });
  await fixture.enter(window, document);
  fixture.runtime.returnButton.click();
  assert.deepEqual(savedData(fixture).themeProgress[THEME_IDS.FOREST], forest);
  fixture.cleanup();
}));

test('saving Dinosaur progress preserves Ocean and other theme buckets exactly', async () => withBrowser(async ({ window, document }) => {
  const ocean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), quests: { progress: { 'ocean-explorer': 2 } } };
  const other = { ...createThemeProgress(THEME_STATUSES.AVAILABLE), world: { marker: 'untouched' } };
  const fixture = createFixture({ saveData: createSave({ ocean, other }) });
  await fixture.enter(window, document);
  fixture.runtime.returnButton.click();
  const themeProgress = savedData(fixture).themeProgress;
  assert.deepEqual(themeProgress[THEME_IDS.OCEAN], ocean);
  assert.deepEqual(themeProgress[THEME_IDS.MAGIC_CASTLE], other);
  fixture.cleanup();
}));

test('missing Dinosaur bucket starts with empty progress and does not affect existing buckets', async () => withBrowser(async ({ window, document }) => {
  const island = createIslandProgress();
  island.inventory = { counts: { 'ancient-coin': 3 } };
  const fixture = createFixture({ saveData: createSave({ island }) });
  await fixture.enter(window, document);
  assert.ok(fixture.runtime.getQuestSnapshot().every(({ progress, completed }) => progress === 0 && !completed));
  assert.ok(fixture.runtime.items.every(({ collected }) => !collected));
  fixture.runtime.returnButton.click();
  const saved = savedData(fixture);
  assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.equal(saved.themeProgress[THEME_IDS.DINOSAUR].quests.exploredLandmarkIds.length, 0);
  assert.equal(SAVE_STORAGE_KEY, 'island-adventure-save');
  fixture.cleanup();
}));

test('AdventureThemeCompletionManager result marks Dinosaur completed in its v2 bucket only when all three required quests finish', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, false);
  for (const landmark of fixture.runtime.landmarks) interactWithLandmark(fixture.runtime, window, landmark);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, false, 'collector quest is still incomplete');
  for (const item of fixture.runtime.items.slice(0, 4)) interactWithItem(fixture.runtime, window, item);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, false, 'collector requires five items');
  interactWithItem(fixture.runtime, window, fixture.runtime.items[4]);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, true);
  fixture.runtime.returnButton.click();
  const saved = savedData(fixture);
  const dinosaur = saved.themeProgress[THEME_IDS.DINOSAUR];
  assert.equal(dinosaur.status, THEME_STATUSES.COMPLETED);
  assert.equal(dinosaur.completion.completed, true);
  assert.equal(dinosaur.completion.completionPolicy, 'required-quests');
  assert.ok(DINOSAUR_QUESTS.every(({ id }) => dinosaur.quests.completed.includes(id)));
  assert.equal(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND].status, THEME_STATUSES.AVAILABLE);
  fixture.cleanup();
}));

test('Reload restores Dinosaur completed state and preserves its completion summary', async () => withBrowser(async ({ window, document }) => {
  const completedSave = await createCompletedDinosaurSave(window, document);
  const fixture = createFixture({ saveData: completedSave });
  await fixture.enter(window, document);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, true);
  assert.equal(fixture.runtime.getQuestSnapshot().every(({ completed }) => completed), true);
  const completionBefore = completedSave.themeProgress[THEME_IDS.DINOSAUR].completion;
  fixture.runtime.returnButton.click();
  assert.deepEqual(savedData(fixture).themeProgress[THEME_IDS.DINOSAUR].completion, completionBefore);
  assert.equal(savedData(fixture).themeProgress[THEME_IDS.DINOSAUR].status, THEME_STATUSES.COMPLETED);
  fixture.cleanup();
}));

test('Continue restoreData rehydrates Dinosaur completion and writes it back only to its bucket', async () => withBrowser(async ({ window, document }) => {
  const completedSave = await createCompletedDinosaurSave(window, document);
  const emptyStorage = new MemoryStorage();
  const fixture = createFixture({ saveData: completedSave, storage: emptyStorage });
  await fixture.enter(window, document);
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, true);
  fixture.runtime.returnButton.click();
  const saved = savedData(fixture);
  assert.equal(saved.themeProgress[THEME_IDS.DINOSAUR].status, THEME_STATUSES.COMPLETED);
  assert.equal(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND].status, completedSave.themeProgress[THEME_IDS.MYSTERY_ISLAND].status);
  fixture.cleanup();
}));

test('Dinosaur completion card stays hidden at 0/3, 1/3, and 2/3 required quests', async () => withBrowser(async ({ window, document }) => {
  const { QuestCompletionUI } = await import('../src/ui/QuestCompletionUI.js');
  for (const completedQuestCount of [0, 1, 2]) {
    const fixture = createFixture();
    await fixture.enter(window, document);
    const runtime = fixture.runtime;
    assert.ok(runtime.questCompletionUI instanceof QuestCompletionUI);
    if (completedQuestCount >= 1) {
      for (const landmark of runtime.landmarks.slice(0, 2)) interactWithLandmark(runtime, window, landmark);
    }
    if (completedQuestCount >= 2) {
      interactWithLandmark(runtime, window, runtime.landmarks[2]);
    }
    assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, completedQuestCount);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(runtime.questCompletionUI.queue.length, 0, `${completedQuestCount}/3 must not show the world completion card`);
    fixture.cleanup();
  }
}));

test('Dinosaur shows the existing completion card with the correct title and result only at 3/3', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  completeAllDinosaurQuests(fixture.runtime, window);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const ui = fixture.runtime.questCompletionUI;
  assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, true);
  assert.equal(ui.queue.length, 1);
  assert.equal(ui.isOpen, true);
  assert.equal(ui.title.textContent, '恐龍世界探險完成！');
  assert.match(ui.description.textContent, /三項必要任務皆已完成/);
  assert.equal(ui.backdrop.dataset.kind, 'general');
  fixture.cleanup();
}));

test('Dinosaur completion feedback appears once per play session', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  completeAllDinosaurQuests(fixture.runtime, window);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const ui = fixture.runtime.questCompletionUI;
  assert.equal(ui.queue.length, 1);
  ui.continueButton.click();
  for (const landmark of fixture.runtime.landmarks) fixture.runtime.questManager.recordLandmarkExplored(landmark.id);
  for (const item of fixture.runtime.items) fixture.runtime.questManager.recordCollection(item.id, item.type);
  assert.equal(fixture.runtime.showDinosaurCompletionIfReady(), false);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(ui.queue.length, 0);
  fixture.cleanup();
}));

test('Reload and Continue preserve completed state without replaying Dinosaur feedback', async () => withBrowser(async ({ window, document }) => {
  const completedSave = await createCompletedDinosaurSave(window, document);
  for (const storage of [undefined, new MemoryStorage()]) {
    const fixture = createFixture({ saveData: completedSave, storage });
    await fixture.enter(window, document);
    assert.equal(fixture.runtime.evaluateDinosaurCompletion().completed, true);
    assert.equal(fixture.runtime.completionFeedbackTriggered, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(fixture.runtime.questCompletionUI.queue.length, 0);
    assert.equal(fixture.runtime.questCompletionUI.isOpen, false);
    fixture.cleanup();
  }
}));

test('Dinosaur completion feedback leaves Island, Forest, and Ocean progress unchanged', async () => withBrowser(async ({ window, document }) => {
  const island = createIslandProgress();
  island.marker = 'island-kept';
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), marker: 'forest-kept' };
  const ocean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), marker: 'ocean-kept' };
  const fixture = createFixture({ saveData: createSave({ island, forest, ocean }) });
  await fixture.enter(window, document);
  completeAllDinosaurQuests(fixture.runtime, window);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.runtime.returnButton.click();
  const progress = savedData(fixture).themeProgress;
  assert.deepEqual(progress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.deepEqual(progress[THEME_IDS.FOREST], forest);
  assert.deepEqual(progress[THEME_IDS.OCEAN], ocean);
  assert.equal(fixture.runtime.isDisposed, true);
  fixture.cleanup();
}));

test('Dinosaur badge remains locked at 0/3, 1/3, and 2/3 required quests', async () => withBrowser(async ({ window, document }) => {
  for (const completedQuestCount of [0, 1, 2]) {
    const fixture = createFixture();
    await fixture.enter(window, document);
    const runtime = fixture.runtime;
    assert.ok(runtime.badgeManager instanceof BadgeManager, 'Dinosaur reuses the existing BadgeManager');
    if (completedQuestCount >= 1) {
      for (const landmark of runtime.landmarks.slice(0, 2)) interactWithLandmark(runtime, window, landmark);
    }
    if (completedQuestCount >= 2) interactWithLandmark(runtime, window, runtime.landmarks[2]);
    assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, completedQuestCount);
    assert.equal(runtime.badgeManager.hasBadge('dinosaur-explorer'), false);
    fixture.cleanup();
  }
}));

test('Dinosaur unlocks the configured Dinosaur World badge exactly once at 3/3 and shows it on the completion card', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const runtime = fixture.runtime;
  completeAllDinosaurQuests(runtime, window);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(runtime.badgeManager.hasBadge('dinosaur-explorer'), true);
  assert.deepEqual(runtime.badgeManager.getBadges().map(({ id }) => id), ['dinosaur-explorer']);
  const badge = runtime.badgeManager.getBadges()[0];
  assert.equal(badge.id, 'dinosaur-explorer');
  assert.equal(badge.title, '恐龍世界探險家');
  assert.equal(runtime.questCompletionUI.badge.hidden, false);
  assert.match(runtime.questCompletionUI.badge.children[1].textContent, /恐龍世界探險家/);
  assert.equal(runtime.badgeManager.unlockBadge('dinosaur-explorer'), false, 'already unlocked badge cannot be added twice');
  assert.deepEqual(runtime.getSaveData().themeProgress[THEME_IDS.DINOSAUR].badges, { unlockedIds: ['dinosaur-explorer'] });
  fixture.cleanup();
}));

test('Reload and Continue preserve the Dinosaur badge without replaying or duplicating it', async () => withBrowser(async ({ window, document }) => {
  const completedSave = await createCompletedDinosaurSave(window, document);
  assert.deepEqual(completedSave.themeProgress[THEME_IDS.DINOSAUR].badges, { unlockedIds: ['dinosaur-explorer'] });
  for (const storage of [undefined, new MemoryStorage()]) {
    const fixture = createFixture({ saveData: completedSave, storage });
    await fixture.enter(window, document);
    assert.equal(fixture.runtime.badgeManager.hasBadge('dinosaur-explorer'), true);
    assert.deepEqual(fixture.runtime.badgeManager.saveState(), { unlockedIds: ['dinosaur-explorer'] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(fixture.runtime.questCompletionUI.queue.length, 0);
    fixture.runtime.returnButton.click();
    assert.deepEqual(savedData(fixture).themeProgress[THEME_IDS.DINOSAUR].badges, { unlockedIds: ['dinosaur-explorer'] });
    fixture.cleanup();
  }
}));

test('Dinosaur badge save preserves Island, Forest, and Ocean badge buckets', async () => withBrowser(async ({ window, document }) => {
  const island = createIslandProgress();
  island.badges = { unlockedIds: ['island-explorer'] };
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), badges: { unlockedIds: ['forest-badge'] } };
  const ocean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), badges: { unlockedIds: ['ocean-explorer'] } };
  const fixture = createFixture({ saveData: createSave({ island, forest, ocean }) });
  await fixture.enter(window, document);
  completeAllDinosaurQuests(fixture.runtime, window);
  fixture.runtime.returnButton.click();
  const progress = savedData(fixture).themeProgress;
  assert.deepEqual(progress[THEME_IDS.DINOSAUR].badges, { unlockedIds: ['dinosaur-explorer'] });
  assert.deepEqual(progress[THEME_IDS.MYSTERY_ISLAND].badges, island.badges);
  assert.deepEqual(progress[THEME_IDS.FOREST].badges, forest.badges);
  assert.deepEqual(progress[THEME_IDS.OCEAN].badges, ocean.badges);
  fixture.cleanup();
}));
