import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import test from 'node:test';
import { SaveManager } from '../src/save/SaveManager.js';
import { SAVE_STORAGE_KEY, SAVE_VERSION } from '../src/save/saveConfig.js';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { AncientDesertRuntime } from '../src/themes/ancient-desert/AncientDesertRuntime.js';
import { ANCIENT_DESERT_COLLECTIBLES } from '../src/themes/ancient-desert/ancientDesertConfig.js';
import { ANCIENT_DESERT_COLLECTIBLE_TYPES } from '../src/themes/ancient-desert/ancientDesertCollectibleConfig.js';
import { ANCIENT_DESERT_QUESTS } from '../src/themes/ancient-desert/ancientDesertQuestConfig.js';

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
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) { if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div')); return this.queries.get(selector); }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ preventDefault() {} }); }
  focus() {}
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
}

class FakeWindow {
  innerWidth = 1000;
  innerHeight = 700;
  devicePixelRatio = 1;
  listeners = new Map();
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  listenerCount(type) { return this.listeners.get(type)?.size ?? 0; }
  dispatch(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  matchMedia() { return { matches: false }; }
  setTimeout(...args) { return globalThis.setTimeout(...args); }
  clearTimeout(id) { globalThis.clearTimeout(id); }
}

class FakeRenderer {
  constructor() { this.domElement = new FakeElement('canvas'); this.shadowMap = {}; this.loop = null; this.disposeCount = 0; }
  setPixelRatio() {}
  setSize() {}
  render() {}
  setAnimationLoop(callback) { this.loop = callback; }
  dispose() { this.disposeCount += 1; }
}

class MemoryStorage {
  constructor(value = null) { this.value = value; }
  getItem(key) { return key === SAVE_STORAGE_KEY ? this.value : null; }
  setItem(key, value) { if (key === SAVE_STORAGE_KEY) this.value = value; }
  removeItem(key) { if (key === SAVE_STORAGE_KEY) this.value = null; }
}

function makeIslandProgress(status = THEME_STATUSES.AVAILABLE) {
  const progress = createThemeProgress(status);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) progress[field] = {};
  return progress;
}

function makeBaseSave() {
  return {
    version: SAVE_VERSION,
    characterId: 'desert-explorer',
    themeProgress: {
      [THEME_IDS.MYSTERY_ISLAND]: makeIslandProgress(),
      [THEME_IDS.FOREST]: createThemeProgress(THEME_STATUSES.IN_PROGRESS),
      [THEME_IDS.OCEAN]: createThemeProgress(THEME_STATUSES.IN_PROGRESS),
      [THEME_IDS.DINOSAUR]: createThemeProgress(THEME_STATUSES.IN_PROGRESS),
      [THEME_IDS.MAGIC_CASTLE]: createThemeProgress(THEME_STATUSES.AVAILABLE),
    },
    legacyData: { keep: true },
  };
}

async function withBrowser(run) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fakeWindow = new FakeWindow();
  const fakeDocument = { createElement: (tag) => new FakeElement(tag) };
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

function fixture({ saveData = null, storage = new MemoryStorage(saveData ? JSON.stringify(saveData) : null) } = {}) {
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  const controls = { disposeCount: 0, dispose() { this.disposeCount += 1; } };
  const saveManager = new SaveManager({ storage, debounceMs: 60000 });
  const inventoryUI = { disposed: false, dispose() { this.disposed = true; } };
  const runtime = new AncientDesertRuntime({
    rendererFactory: () => renderer,
    mobileControlsFactory: async () => controls,
    inventoryUIFactory: (options) => { inventoryUI.options = options; return inventoryUI; },
    playerModelLoader: async () => new THREE.Group(),
    clockFactory: () => ({ getDelta: () => 1 / 30 }),
  });
  let returns = 0;
  return {
    app, renderer, controls, runtime, storage, saveManager, inventoryUI,
    enter: (window, document) => runtime.enter({
      app, character: { id: 'desert-explorer', modelPath: '/player.glb' }, window, document,
      restoreData: saveData,
      saveManager,
      onBack: () => { returns += 1; },
    }),
    get returns() { return returns; },
    cleanup(clearSave = true) { runtime.exit(); if (clearSave) saveManager.clearSave(); },
  };
}

function press(window, code = 'KeyE') { window.dispatch('keydown', { code, repeat: false, preventDefault() {} }); }

test('AncientDesertRuntime creates the desert scene, player, camera, mobile controls, five items, and three quests', async () => withBrowser(async ({ window, document }) => {
  const testFixture = fixture();
  await testFixture.enter(window, document);
  assert.equal(testFixture.runtime.scene.name, 'AncientDesertScene');
  assert.ok(testFixture.runtime.camera instanceof THREE.PerspectiveCamera);
  assert.ok(testFixture.runtime.player.object3D);
  assert.equal(testFixture.runtime.player.groundHeightAt, testFixture.runtime.groundHeightAt);
  assert.ok(testFixture.runtime.cameraTarget instanceof THREE.Vector3);
  assert.deepEqual(testFixture.runtime.landmarks.map(({ id }) => id), ['ancient-desert-temple', 'ancient-desert-oasis', 'ancient-desert-ruins']);
  assert.deepEqual(testFixture.runtime.items.map(({ id }) => id), ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(testFixture.runtime.inventoryManager.types.map(({ id }) => id), ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.deepEqual(testFixture.runtime.getQuestSnapshot().map(({ id }) => id), ANCIENT_DESERT_QUESTS.map(({ id }) => id));
  assert.ok(testFixture.runtime.getQuestSnapshot().every(({ progress }) => progress === 0));
  assert.equal(testFixture.runtime.renderer.loop instanceof Function, true);
  assert.equal(testFixture.runtime.audioManager, undefined);
  assert.equal(testFixture.runtime.saveManager, testFixture.saveManager);
  const indicator = testFixture.runtime.directionIndicator;
  assert.ok(indicator);
  testFixture.runtime.frame();
  assert.equal(indicator.element.hidden, false);
  assert.equal(indicator.name.textContent, testFixture.runtime.landmarks.find(({ id }) => id === indicator.getTarget().id).title);
  testFixture.cleanup();
  assert.equal(indicator.element.parentNode, null);
}));

test('WASD moves the player on stable desert ground and camera follows', async () => withBrowser(async ({ window, document }) => {
  const testFixture = fixture();
  await testFixture.enter(window, document);
  const start = testFixture.runtime.player.object3D.position.clone();
  press(window, 'KeyW');
  testFixture.runtime.frame();
  window.dispatch('keyup', { code: 'KeyW', preventDefault() {} });
  assert.notDeepEqual(testFixture.runtime.player.object3D.position.toArray(), start.toArray());
  assert.equal(testFixture.runtime.player.object3D.position.y, testFixture.runtime.groundHeightAt(0, 0));
  testFixture.cleanup();
}));

test('E explores a landmark once and updates both landmark quests', async () => withBrowser(async ({ window, document }) => {
  const testFixture = fixture();
  await testFixture.enter(window, document);
  const landmark = testFixture.runtime.landmarks[0];
  testFixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  testFixture.runtime.interactionManager.update();
  assert.equal(testFixture.runtime.interactionManager.prompt.hidden, false);
  press(window);
  assert.equal(testFixture.runtime.interactionManager.activeLandmark.id, landmark.id);
  assert.equal(testFixture.runtime.interactionManager.backdrop.querySelector('[data-dialog-title]').textContent, landmark.name);
  assert.equal(testFixture.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-explorer').progress, 1);
  assert.equal(testFixture.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-discoverer').progress, 1);
  testFixture.runtime.interactionManager.closeDialog();
  press(window);
  assert.equal(testFixture.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-explorer').progress, 1);
  assert.deepEqual([...testFixture.runtime.questManager.exploredLandmarkIds], [landmark.id]);
  testFixture.cleanup();
}));

test('E picks up a collectible once and updates collector quest progress', async () => withBrowser(async ({ window, document }) => {
  const testFixture = fixture();
  await testFixture.enter(window, document);
  const item = testFixture.runtime.items[0];
  testFixture.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  testFixture.runtime.interactionManager.update();
  assert.equal(testFixture.runtime.interactionManager.prompt.hidden, false);
  press(window);
  assert.equal(item.collected, true);
  assert.equal(item.object3D.visible, false);
  assert.equal(testFixture.runtime.interactionManager.toast.textContent, `✨ 已取得：${item.name}`);
  assert.equal(testFixture.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-collector').progress, 1);
  assert.equal(testFixture.runtime.inventoryManager.getCount(item.type), 1);
  press(window);
  assert.equal(testFixture.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-collector').progress, 1);
  assert.deepEqual([...testFixture.runtime.questManager.collectedItemIds], [item.id]);
  assert.equal(testFixture.inventoryUI.options.inventory, testFixture.runtime.inventoryManager);
  testFixture.cleanup();
}));

test('return button exits, disposes runtime resources, and returns to Adventure World once', async () => withBrowser(async ({ window, document }) => {
  const testFixture = fixture();
  await testFixture.enter(window, document);
  const canvas = testFixture.renderer.domElement;
  testFixture.runtime.returnButton.click();
  assert.equal(testFixture.returns, 1);
  assert.equal(testFixture.runtime.isActive, false);
  assert.equal(testFixture.renderer.loop, null);
  assert.equal(testFixture.renderer.disposeCount, 1);
  assert.equal(testFixture.controls.disposeCount, 1);
  assert.equal(canvas.parentNode, null);
  assert.equal(testFixture.runtime.interactionManager, null);
  assert.equal(testFixture.inventoryUI.disposed, true);
  assert.equal(testFixture.runtime.inventoryManager, null);
  assert.equal(testFixture.runtime.scene, null);
  assert.equal(testFixture.runtime.returnButton, null);
  assert.equal(window.listenerCount('resize'), 0);
  assert.equal(window.listenerCount('keydown'), 0);
  const initialSave = JSON.parse(testFixture.storage.value);
  assert.equal(initialSave.version, SAVE_VERSION);
  assert.ok(initialSave.themeProgress[THEME_IDS.ANCIENT_DESERT]);
  testFixture.saveManager.clearSave();
}));

test('Ancient Desert runtime uses shared BadgeManager and QuestCompletionUI without creating another AudioManager', async () => {
  const source = await readFile(new URL('../src/themes/ancient-desert/AncientDesertRuntime.js', import.meta.url), 'utf8');
  assert.match(source, /new BadgeManager\(/);
  assert.match(source, /QuestCompletionUI/);
  assert.doesNotMatch(source, /new AudioManager\(/);
});

function explore(runtime, window, landmark) {
  runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  runtime.interactionManager.update();
  press(window);
  runtime.interactionManager.closeDialog();
}

function collect(runtime, window, item) {
  runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  runtime.interactionManager.update();
  press(window);
}

test('Ancient Desert writes only its v2 bucket and preserves all other theme data', async () => withBrowser(async ({ window, document }) => {
  const saveData = makeBaseSave();
  const originalBuckets = structuredClone(saveData.themeProgress);
  const testFixture = fixture({ saveData });
  await testFixture.enter(window, document);
  const landmark = testFixture.runtime.landmarks[0];
  const item = testFixture.runtime.items[0];
  explore(testFixture.runtime, window, landmark);
  collect(testFixture.runtime, window, item);
  testFixture.runtime.player.object3D.position.set(3, 0, 4);
  testFixture.runtime.player.object3D.rotation.y = 0.72;
  testFixture.runtime.returnButton.click();

  const saved = JSON.parse(testFixture.storage.value);
  const desert = saved.themeProgress[THEME_IDS.ANCIENT_DESERT];
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(testFixture.saveManager.key, SAVE_STORAGE_KEY);
  assert.equal(desert.status, THEME_STATUSES.IN_PROGRESS);
  assert.deepEqual(desert.quests.exploredLandmarkIds, [landmark.id]);
  assert.equal(desert.quests.progress['ancient-desert-explorer'], 1);
  assert.equal(desert.quests.progress['ancient-desert-discoverer'], 1);
  assert.deepEqual(desert.quests.collectedItemIds, [item.id]);
  assert.deepEqual(desert.collections.collectedItemIds, [item.id]);
  assert.equal(desert.quests.progress['ancient-desert-collector'], 1);
  assert.deepEqual(desert.world.player, { x: 3, z: 4, rotationY: 0.72 });
  assert.equal(desert.completion, null);
  assert.deepEqual(saved.themeProgress, { ...originalBuckets, [THEME_IDS.ANCIENT_DESERT]: desert });
  assert.deepEqual(saved.legacyData, { keep: true });
  testFixture.cleanup();
}));

test('Reload restores Ancient Desert exploration, collectibles, quest progress, and player position', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeBaseSave()));
  const first = fixture({ storage });
  await first.enter(window, document);
  const landmark = first.runtime.landmarks[0];
  const item = first.runtime.items[0];
  explore(first.runtime, window, landmark);
  collect(first.runtime, window, item);
  first.runtime.player.object3D.position.set(4, 0, 2);
  first.runtime.player.object3D.rotation.y = 0.4;
  first.runtime.returnButton.click();

  const restored = fixture({ storage });
  await restored.enter(window, document);
  assert.deepEqual([...restored.runtime.questManager.exploredLandmarkIds], [landmark.id]);
  assert.deepEqual([...restored.runtime.questManager.collectedItemIds], [item.id]);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-explorer').progress, 1);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-collector').progress, 1);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-discoverer').progress, 1);
  assert.equal(restored.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  assert.equal(restored.runtime.inventoryManager.getCount(item.type), 1);
  assert.deepEqual(restored.runtime.player.object3D.position.toArray(), [4, 0, 2]);
  assert.equal(restored.runtime.player.object3D.rotation.y, 0.4);
  explore(restored.runtime, window, landmark);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-explorer').progress, 1);
  assert.equal(restored.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  restored.cleanup();
}));

test('Ancient Desert completion uses its configured three required quests and persists through Continue', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeBaseSave()));
  const testFixture = fixture({ storage });
  await testFixture.enter(window, document);
  const runtime = testFixture.runtime;
  assert.equal(runtime.evaluateAncientDesertCompletion().completed, false);
  explore(runtime, window, runtime.landmarks[0]);
  assert.equal(runtime.evaluateAncientDesertCompletion().completed, false);
  explore(runtime, window, runtime.landmarks[1]);
  assert.equal(runtime.evaluateAncientDesertCompletion().completed, false);
  for (const item of runtime.items) collect(runtime, window, item);
  assert.equal(runtime.getQuestSnapshot().find(({ id }) => id === 'ancient-desert-collector').completed, true);
  assert.equal(runtime.evaluateAncientDesertCompletion().completed, false, 'the explorer quest is still incomplete');
  explore(runtime, window, runtime.landmarks[2]);
  assert.deepEqual(runtime.getQuestSnapshot().filter(({ completed }) => completed).map(({ id }) => id), ANCIENT_DESERT_QUESTS.map(({ id }) => id));
  assert.deepEqual(ANCIENT_DESERT_QUESTS.map(({ id }) => id), [
    'ancient-desert-explorer', 'ancient-desert-collector', 'ancient-desert-discoverer',
  ]);
  assert.equal(runtime.evaluateAncientDesertCompletion().completed, true);
  testFixture.runtime.returnButton.click();
  const desert = JSON.parse(storage.value).themeProgress[THEME_IDS.ANCIENT_DESERT];
  assert.equal(desert.status, THEME_STATUSES.COMPLETED);
  assert.equal(desert.completion.completionPolicy, 'required-quests');
  assert.equal(desert.completion.completed, true);
  assert.ok(ANCIENT_DESERT_QUESTS.every(({ id }) => desert.quests.completed.includes(id)));
  testFixture.cleanup(false);

  const continued = fixture({ storage });
  await continued.enter(window, document);
  assert.equal(continued.runtime.evaluateAncientDesertCompletion().completed, true);
  assert.equal(continued.runtime.getQuestSnapshot().every(({ completed }) => completed), true);
  assert.ok(continued.runtime.items.every(({ collected }) => collected));
  continued.cleanup();
}));

test('Ancient Desert shows the existing completion card and unlocks its badge once only at 3/3 quests', async () => withBrowser(async ({ window, document }) => {
  const saveData = makeBaseSave();
  saveData.themeProgress[THEME_IDS.MYSTERY_ISLAND].badges = { unlockedIds: ['island-explorer'] };
  saveData.themeProgress[THEME_IDS.FOREST].badges = { unlockedIds: ['forest-explorer'] };
  saveData.themeProgress[THEME_IDS.OCEAN].badges = { unlockedIds: ['ocean-explorer'] };
  saveData.themeProgress[THEME_IDS.DINOSAUR].badges = { unlockedIds: ['dinosaur-explorer'] };
  const originalWorldBadges = structuredClone(saveData.themeProgress);
  const storage = new MemoryStorage(JSON.stringify(saveData));
  const testFixture = fixture({ saveData, storage });
  await testFixture.enter(window, document);
  const runtime = testFixture.runtime;
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  assert.equal(runtime.badgeManager.hasBadge('ancient-desert-explorer'), false);

  explore(runtime, window, runtime.landmarks[0]);
  assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, 0);
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  assert.equal(runtime.badgeManager.hasBadge('ancient-desert-explorer'), false);
  explore(runtime, window, runtime.landmarks[1]);
  assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, 1);
  for (const item of runtime.items) collect(runtime, window, item);
  assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, 2);
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  assert.equal(runtime.badgeManager.hasBadge('ancient-desert-explorer'), false);
  explore(runtime, window, runtime.landmarks[2]);
  runtime.frame();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const ui = runtime.questCompletionUI;
  assert.equal(ui.queue.length, 1);
  assert.equal(ui.isOpen, true);
  assert.equal(ui.title.textContent, '古文明沙漠探險完成！');
  assert.match(ui.description.textContent, /三項必要任務皆已完成/);
  assert.equal(runtime.badgeManager.hasBadge('ancient-desert-explorer'), true);
  assert.deepEqual(runtime.badgeManager.getBadges().map(({ id }) => id), ['ancient-desert-explorer']);
  assert.equal(runtime.badgeManager.getBadges()[0].title, '古文明沙漠探險家');
  assert.equal(ui.badge.hidden, false);
  assert.match(ui.badge.children[1].textContent, /古文明沙漠探險家/);
  assert.equal(runtime.showAncientDesertCompletionIfReady(), false);
  ui.continueButton.click();
  assert.equal(ui.queue.length, 0);
  assert.equal(runtime.badgeManager.unlockBadge('ancient-desert-explorer'), false);
  runtime.returnButton.click();

  const saved = JSON.parse(storage.value);
  assert.deepEqual(saved.themeProgress[THEME_IDS.ANCIENT_DESERT].badges, { unlockedIds: ['ancient-desert-explorer'] });
  for (const themeId of [THEME_IDS.MYSTERY_ISLAND, THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR]) {
    assert.deepEqual(saved.themeProgress[themeId].badges, originalWorldBadges[themeId].badges);
  }
  testFixture.cleanup(false);

  const continued = fixture({ storage });
  await continued.enter(window, document);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(continued.runtime.evaluateAncientDesertCompletion().completed, true);
  assert.equal(continued.runtime.badgeManager.hasBadge('ancient-desert-explorer'), true);
  assert.equal(continued.runtime.questCompletionUI.queue.length, 0);
  assert.equal(continued.runtime.questCompletionUI.isOpen, false);
  continued.cleanup();
}));

test('Reload of a completed Ancient Desert save backfills its badge without replaying completion feedback', async () => withBrowser(async ({ window, document }) => {
  const saveData = makeBaseSave();
  const questIds = ANCIENT_DESERT_QUESTS.map(({ id }) => id);
  const spawnIds = ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id);
  saveData.themeProgress[THEME_IDS.ANCIENT_DESERT] = {
    ...createThemeProgress(THEME_STATUSES.COMPLETED),
    quests: {
      progress: { 'ancient-desert-explorer': 3, 'ancient-desert-collector': 5, 'ancient-desert-discoverer': 2 },
      completed: questIds,
      collectedItemIds: spawnIds,
      exploredLandmarkIds: ['ancient-desert-temple', 'ancient-desert-oasis', 'ancient-desert-ruins'],
    },
    collections: { collectedItemIds: spawnIds },
    badges: { unlockedIds: [] },
    world: { player: { x: 2, z: 3, rotationY: 0.5 } },
    completion: { completed: true, completedAt: 'saved-time', completionPolicy: 'required-quests' },
  };
  const storage = new MemoryStorage(JSON.stringify(saveData));
  const testFixture = fixture({ saveData, storage });
  await testFixture.enter(window, document);
  assert.equal(testFixture.runtime.evaluateAncientDesertCompletion().completed, true);
  assert.equal(testFixture.runtime.completionFeedbackTriggered, true);
  assert.equal(testFixture.runtime.badgeManager.hasBadge('ancient-desert-explorer'), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(testFixture.runtime.questCompletionUI.queue.length, 0);
  assert.equal(testFixture.runtime.questCompletionUI.isOpen, false);
  testFixture.runtime.returnButton.click();
  const saved = JSON.parse(storage.value);
  assert.deepEqual(saved.themeProgress[THEME_IDS.ANCIENT_DESERT].badges, { unlockedIds: ['ancient-desert-explorer'] });
  testFixture.cleanup();
}));
