import assert from 'node:assert/strict';
import * as THREE from 'three';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { SaveManager } from '../src/save/SaveManager.js';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { FOREST_COLLECTIBLE_TYPES, FOREST_COLLECTIBLES, FOREST_QUESTS } from '../src/themes/forest/forestConfig.js';
import { ForestRuntime } from '../src/themes/forest/ForestRuntime.js';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName; this.children = []; this.listeners = new Map(); this.attributes = new Map();
    this.queries = new Map(); this.style = {}; this.dataset = {};
    this.classList = { add() {}, remove() {}, toggle() {} }; this.disabled = false; this.hidden = false; this.parentNode = null;
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) { if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div')); return this.queries.get(selector); }
  focus() {}
  click() { if (!this.disabled) for (const fn of this.listeners.get('click') ?? []) fn({ preventDefault() {} }); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; } }
}

class FakeWindow {
  constructor() { this.innerWidth = 900; this.innerHeight = 700; this.devicePixelRatio = 1; this.listeners = new Map(); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  listenerCount(type) { return this.listeners.get(type)?.size ?? 0; }
  matchMedia() { return { matches: false }; }
  setTimeout(...args) { return globalThis.setTimeout(...args); }
  clearTimeout(id) { globalThis.clearTimeout(id); }
}

class FakeRenderer {
  constructor() { this.domElement = new FakeElement('canvas'); this.shadowMap = {}; this.disposed = 0; this.loop = null; }
  setPixelRatio() {}
  setSize() {}
  render() {}
  setAnimationLoop(callback) { this.loop = callback; }
  dispose() { this.disposed += 1; }
}

class FakeInteractionManager {
  constructor({ items, landmarks, inventory, questManager }) {
    this.items = items;
    this.landmarks = landmarks;
    this.inventory = inventory;
    this.questManager = questManager;
    this.collectedItemIds = [];
    this.activeLandmark = null;
    this.suspended = false;
    this.disposed = 0;
  }
  loadState(state) {
    this.collectedItemIds = [...(state?.collectedItemIds ?? [])];
    for (const item of this.items) item.collected = this.collectedItemIds.includes(item.id);
  }
  saveState() { return { collectedItemIds: [...this.collectedItemIds] }; }
  collectItem(item) {
    if (!item || item.collected) return false;
    item.collected = true;
    this.collectedItemIds.push(item.id);
    this.inventory.add(item.type);
    this.questManager.recordCollection(item.id, item.type);
    return true;
  }
  setSuspended(value) { this.suspended = value; }
  update() {}
  dispose() { this.disposed += 1; }
}

function fakeUIFactory() { return { dispose() {} }; }
function fakeMobileControlsFactory({ window }) {
  const listener = () => {};
  window.addEventListener('pointermove', listener);
  return { enabled: true, dispose() { window.removeEventListener('pointermove', listener); } };
}
class MemoryStorage {
  constructor(initial = null, { failWrites = false } = {}) { this.value = initial; this.failWrites = failWrites; }
  getItem() { return this.value; }
  setItem(_key, value) { if (this.failWrites) throw new Error('storage quota'); this.value = value; }
  removeItem() { this.value = null; }
}

function islandBucket() {
  const bucket = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) bucket[field] = {};
  return bucket;
}
function makeSave({ forest = null, ocean = null, mystery = islandBucket() } = {}) {
  const themeProgress = { [THEME_IDS.MYSTERY_ISLAND]: mystery };
  if (forest) themeProgress[THEME_IDS.FOREST] = forest;
  if (ocean) themeProgress[THEME_IDS.OCEAN] = ocean;
  return { version: SAVE_VERSION, characterId: 'girl-explorer', themeProgress, legacyData: { retained: true } };
}

async function withBrowser(run, { touch = false } = {}) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fakeWindow = new FakeWindow();
  if (touch) fakeWindow.matchMedia = () => ({ matches: true });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (tag) => new FakeElement(tag) } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: touch ? 1 : 0 } });
  try { return await run(fakeWindow); }
  finally {
    for (const [key, descriptor] of [['window', oldWindow], ['document', oldDocument], ['navigator', oldNavigator]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

async function createFixture({ save = null, failWrites = false, directionIndicatorFactory } = {}) {
  const storage = new MemoryStorage(save ? JSON.stringify(save) : null, { failWrites });
  const saveManager = new SaveManager({ storage, debounceMs: 60000 });
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  let returned = 0;
  const runtime = new ForestRuntime({
    rendererFactory: () => renderer,
    playerModelLoader: async () => new THREE.Group(),
    interactionManagerFactory: async (options) => new FakeInteractionManager(options),
    mobileControlsFactory: async (options) => fakeMobileControlsFactory({ ...options, window }),
    questUIFactory: async () => fakeUIFactory(),
    inventoryUIFactory: async () => fakeUIFactory(),
    directionIndicatorFactory,
  });
  await runtime.enter({
    app, character: { id: 'girl-explorer', modelPath: '/player.glb' }, restoreData: save, saveManager,
    window, document, gameState: { set() {} }, onBack: () => { returned += 1; },
  });
  return { runtime, saveManager, storage, app, renderer, get returned() { return returned; }, window };
}
function cleanup(fixture) { fixture.runtime.exit(); fixture.saveManager.clearSave(); }

test('enter creates the Forest scene and player', () => withBrowser(async () => {
  const f = await createFixture();
  try {
    assert.equal(f.runtime.scene.name, 'MysteryForestScene');
    assert.ok(f.runtime.player.object3D.isGroup);
    assert.equal(f.runtime.player.enabled, true);
    assert.equal(typeof f.runtime.renderer.loop, 'function');
  } finally { cleanup(f); }
}));

test('Forest shows the Island-style WASD hint and removes it on exit', () => withBrowser(async () => {
  const f = await createFixture();
  try {
    const hints = f.app.children.filter((child) => child.id === 'status');
    assert.equal(hints.length, 1);
    assert.equal(hints[0].textContent, 'W / A / S / D 移動');
    assert.equal(hints[0].attributes.get('role'), 'status');
    assert.equal(hints[0].style.top, '68px');
    f.runtime.exit();
    assert.equal(f.app.children.some((child) => child.id === 'status'), false);
    assert.equal(f.runtime.movementHintTimer, null);
  } finally { cleanup(f); }
}));
test('Forest QuestManager contains only the three Forest quests', () => withBrowser(async () => {
  const f = await createFixture();
  try { assert.deepEqual(f.runtime.questManager.quests.map(({ id }) => id), FOREST_QUESTS.map(({ id }) => id)); }
  finally { cleanup(f); }
}));

test('Forest inventory interactables use Forest collectible IDs', () => withBrowser(async () => {
  const f = await createFixture();
  try {
    assert.deepEqual(f.runtime.interactionManager.items.map(({ id }) => id), FOREST_COLLECTIBLES.map(({ id }) => id));
    assert.deepEqual(f.runtime.inventoryManager.types.map(({ id }) => id), FOREST_COLLECTIBLE_TYPES.map(({ id }) => id));
    assert.ok(f.runtime.interactionManager.items.every((item) => FOREST_COLLECTIBLE_TYPES.some((type) => type.id === item.type)));
    assert.deepEqual(f.runtime.interactionManager.items.map(({ object3D }) => object3D.children.find((child) => child.name)?.name), [
      'magic-mushroom-stem', 'ancient-seed-body', 'butterfly-upper-left-wing', 'forest-feather-shaft', 'fairy-leaf-blade',
    ]);
  } finally { cleanup(f); }
}));

test('enter builds all configured Forest landmarks', () => withBrowser(async () => {
  const f = await createFixture();
  try { assert.deepEqual(f.runtime.landmarks.map(({ id }) => id), ['forest-entrance', 'forest-stream', 'forest-mysterious-rock']); }
  finally { cleanup(f); }
}));

test('Forest navigation selects valid Forest targets, updates each frame, hides without targets, and disposes on exit', () => withBrowser(async () => {
  let indicatorOptions;
  const f = await createFixture({
    directionIndicatorFactory: async (options) => {
      indicatorOptions = options;
      const element = new FakeElement('section');
      element.className = 'item-direction-indicator';
      element.hidden = true;
      options.app.appendChild(element);
      return {
        element,
        updateCount: 0,
        disposeCount: 0,
        update() {
          this.updateCount += 1;
          this.target = options.getTarget();
          this.element.hidden = !this.target;
        },
        dispose() { this.disposeCount += 1; this.element.remove(); },
      };
    },
  });
  try {
    const indicator = f.runtime.directionIndicator;
    assert.ok(indicator);
    assert.equal(indicator.element.parentNode, f.app);
    assert.equal(indicatorOptions.player, f.runtime.player);
    assert.equal(typeof indicatorOptions.getCameraForward, 'function');

    const first = f.runtime.getDirectionTarget();
    assert.equal(first.taskId, 'forest-explorer');
    assert.equal(first.kind, 'landmark');
    assert.ok(['forest-entrance', 'forest-stream', 'forest-mysterious-rock'].includes(first.id));
    assert.ok(Number.isFinite(first.position.x) && Number.isFinite(first.position.z));

    f.runtime.renderer.loop();
    assert.equal(indicator.updateCount, 1);
    assert.equal(indicator.element.hidden, false);
    assert.equal(indicator.target.id, first.id);

    f.runtime.questManager.recordLandmarkExplored(first.id);
    const nextLandmark = f.runtime.getDirectionTarget();
    assert.equal(nextLandmark.taskId, 'forest-explorer');
    assert.notEqual(nextLandmark.id, first.id);

    for (const landmark of f.runtime.landmarks) f.runtime.questManager.recordLandmarkExplored(landmark.id);
    const firstCollectible = f.runtime.getDirectionTarget();
    assert.equal(firstCollectible.taskId, 'forest-collector');
    assert.equal(firstCollectible.kind, 'item');
    assert.ok(FOREST_COLLECTIBLES.some(({ id }) => id === firstCollectible.id));

    for (const item of f.runtime.items) f.runtime.questManager.recordCollection(item.id, item.type);
    assert.equal(f.runtime.getDirectionTarget(), null);
    f.runtime.renderer.loop();
    assert.equal(indicator.element.hidden, true);
    assert.equal(indicator.updateCount, 2);

    f.runtime.exit();
    assert.equal(indicator.disposeCount, 1);
    assert.equal(indicator.element.parentNode, null);
    assert.equal(f.runtime.directionIndicator, null);
  } finally { cleanup(f); }
}));

test('Forest restore restores quests, inventory, collections, world, and completion fields', () => withBrowser(async () => {
  const forest = {
    ...createThemeProgress(THEME_STATUSES.IN_PROGRESS),
    quests: { progress: { 'forest-explorer': 2 }, completed: [], collectedItemIds: [], exploredLandmarkIds: [] },
    inventory: { counts: { 'mysterious-crystal': 1 } },
    collections: { collectedItemIds: ['forest-collectible-2'] }, discoveries: { note: true },
    world: { player: { x: 3, z: 2, rotationY: 0.75 } }, hasSeenTutorial: true, completion: { marker: 'preserve-me' },
  };
  const f = await createFixture({ save: makeSave({ forest }) });
  try {
    assert.equal(f.runtime.questManager.getSnapshot().find(({ id }) => id === 'forest-explorer').progress, 2);
    assert.equal(f.runtime.inventoryManager.getCount('forest-ancient-seed'), 1);
    assert.equal(f.runtime.interactionManager.items.find(({ id }) => id === 'forest-collectible-2').collected, true);
    assert.deepEqual(f.runtime.player.object3D.position.toArray().filter((_v, i) => i !== 1), [3, 2]);
    assert.equal(f.runtime.player.object3D.rotation.y, 0.75);
    assert.equal(f.runtime.getRestoreForestProgress().hasSeenTutorial, true);
    assert.deepEqual(f.runtime.getRestoreForestProgress().discoveries, { note: true });
    assert.deepEqual(f.runtime.getRestoreForestProgress().completion, { marker: 'preserve-me' });
  } finally { cleanup(f); }
}));

test('Mystery Island quest progress is not loaded into Forest QuestManager', () => withBrowser(async () => {
  const mystery = islandBucket();
  mystery.quests = { progress: { 'crystal-explorer': 3, 'island-adventurer': 2, collector: 5 }, completed: ['crystal-explorer', 'island-adventurer', 'collector'] };
  const f = await createFixture({ save: makeSave({ mystery }) });
  try {
    assert.deepEqual(f.runtime.questManager.getSnapshot().map(({ progress, completed }) => ({ progress, completed })), FOREST_QUESTS.map(() => ({ progress: 0, completed: false })));
  } finally { cleanup(f); }
}));

test('saving updates only Forest progress and preserves Mystery Island, other themes, character, and legacy data', () => withBrowser(async () => {
  const mystery = islandBucket();
  mystery.inventory = { counts: { 'ancient-coin': 2, 'mysterious-crystal': 1 } };
  mystery.quests = { progress: { 'crystal-explorer': 2 }, completed: [] };
  const ocean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), inventory: { counts: { 'ocean-deep-pearl': 3 } }, quests: { progress: { 'ocean-task': 1 } } };
  const f = await createFixture({ save: makeSave({ mystery, ocean }) });
  try {
    f.runtime.interactionManager.collectItem(f.runtime.interactionManager.items[0]);
    f.runtime.returnButton.click();
    const saved = JSON.parse(f.storage.value);
    assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], mystery);
    assert.deepEqual(saved.themeProgress[THEME_IDS.OCEAN], ocean);
    assert.equal(saved.themeProgress[THEME_IDS.FOREST].status, THEME_STATUSES.IN_PROGRESS);
    assert.ok(saved.themeProgress[THEME_IDS.FOREST].quests.progress['forest-collector'] > 0);
    assert.equal(saved.themeProgress[THEME_IDS.FOREST].inventory.counts['forest-magic-mushroom'], 1);
    assert.deepEqual(saved.themeProgress[THEME_IDS.FOREST].inventory.counts, {
      'forest-magic-mushroom': 1,
      'forest-ancient-seed': 0,
      'forest-butterfly-specimen': 0,
      'forest-forest-feather': 0,
      'forest-fairy-leaf': 0,
    });
    assert.equal(saved.characterId, 'girl-explorer');
    assert.deepEqual(saved.legacyData, { retained: true });
    assert.equal(f.returned, 1);
  } finally { cleanup(f); }
}));

test('incomplete Forest quests remain in progress when leaving', () => withBrowser(async () => {
  const f = await createFixture();
  try {
    f.runtime.questManager.loadState({ progress: { 'forest-explorer': 3 }, completed: ['forest-explorer'] });
    f.runtime.returnButton.click();
    const forest = JSON.parse(f.storage.value).themeProgress[THEME_IDS.FOREST];
    assert.equal(forest.status, THEME_STATUSES.IN_PROGRESS);
    assert.equal(forest.completion, null);
    assert.equal(f.returned, 1);
  } finally { cleanup(f); }
}));

test('all required Forest quests save only Forest completion and preserve other Theme progress', () => withBrowser(async () => {
  const mystery = islandBucket();
  mystery.quests = { progress: { 'crystal-explorer': 1 }, completed: [] };
  const ocean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), quests: { progress: { 'ocean-task': 2 } } };
  const f = await createFixture({ save: makeSave({ mystery, ocean }) });
  try {
    f.runtime.questManager.loadState({
      progress: Object.fromEntries(FOREST_QUESTS.map(({ id, target }) => [id, target])),
      completed: FOREST_QUESTS.map(({ id }) => id),
    });
    f.runtime.returnButton.click();
    const saved = JSON.parse(f.storage.value);
    const forest = saved.themeProgress[THEME_IDS.FOREST];
    assert.equal(forest.status, THEME_STATUSES.COMPLETED);
    assert.equal(forest.completion.completed, true);
    assert.equal(typeof forest.completion.completedAt, 'string');
    assert.equal(forest.completion.completionPolicy, 'required-quests');
    assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], mystery);
    assert.deepEqual(saved.themeProgress[THEME_IDS.OCEAN], ocean);
    assert.equal(f.returned, 1);
  } finally { cleanup(f); }
}));

test('return saves and disposes before calling Adventure World callback', () => withBrowser(async () => {
  const f = await createFixture();
  try {
    let callbackSawCleanRuntime = false;
    f.runtime.onBack = () => { callbackSawCleanRuntime = f.runtime.isDisposed && f.runtime.scene === null; };
    f.runtime.returnButton.click();
    assert.equal(callbackSawCleanRuntime, true);
    assert.equal(f.renderer.disposed, 1);
    assert.notEqual(f.storage.value, null);
  } finally { cleanup(f); }
}));

test('save failure keeps Forest active and does not call Adventure World callback', () => withBrowser(async () => {
  const f = await createFixture({ failWrites: true });
  try {
    f.runtime.returnButton.click();
    assert.equal(f.runtime.isActive, true);
    assert.equal(f.runtime.isDisposed, false);
    assert.equal(f.runtime.scene.name, 'MysteryForestScene');
    assert.equal(f.renderer.disposed, 0);
    assert.equal(f.returned, 0);
  } finally { cleanup(f); }
}));

test('exit cleans renderer and input listeners and is safe to call repeatedly', () => withBrowser(async (win) => {
  const f = await createFixture({ touch: true });
  try {
    assert.equal(f.runtime.mobileControls.enabled, true);
    const canvas = f.renderer.domElement;
    f.runtime.exit();
    f.runtime.exit();
    assert.equal(f.renderer.disposed, 1);
    assert.equal(canvas.parentNode, null);
    assert.equal(f.runtime.scene, null);
    assert.equal(win.listenerCount('resize'), 0);
    assert.equal(win.listenerCount('keydown'), 0);
    assert.equal(win.listenerCount('keyup'), 0);
    assert.equal(win.listenerCount('pointermove'), 0);
  } finally { cleanup(f); }
}));
