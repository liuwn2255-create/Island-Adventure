import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import test from 'node:test';
import { SaveManager } from '../src/save/SaveManager.js';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { BADGES } from '../src/badges/badgeConfig.js';
import { AdventureThemeCompletionManager } from '../src/adventure/AdventureThemeCompletionManager.js';
import { ADVENTURE_THEMES, createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { createOceanScene, oceanGroundHeightAt } from '../src/themes/ocean/createOceanScene.js';
import { OceanRuntime } from '../src/themes/ocean/OceanRuntime.js';
import { OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES, OCEAN_LANDMARKS, OCEAN_QUESTS } from '../src/themes/ocean/oceanConfig.js';

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
    this.style = {};
    this.dataset = {};
    this.classList = { add() {}, remove() {} };
    this.queries = new Map();
    this.parentNode = null;
    this.disabled = false;
    this.hidden = false;
  }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  querySelector(selector) {
    if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div'));
    return this.queries.get(selector);
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ preventDefault() {} }); }
  focus() { this.focused = true; }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}

class FakeWindow {
  innerWidth = 900;
  innerHeight = 700;
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

class FakeInteractionManager {
  constructor({ player, landmarks, items = [], inventory = null, questManager = null }) {
    this.player = player;
    this.landmarks = landmarks;
    this.items = items;
    this.inventory = inventory;
    this.questManager = questManager;
    this.activeLandmark = null;
    this.nearestLandmark = null;
    this.nearestInteractable = null;
    this.prompt = new FakeElement('div');
    this.prompt.hidden = true;
    this.disposed = false;
    this.onKeyDown = (event) => {
      if (event.code !== 'KeyE' || event.repeat || this.activeLandmark) return;
      this.update();
      if (!this.nearestInteractable) return;
      if (this.nearestInteractable.kind === 'item') {
        const item = this.nearestInteractable.object;
        if (item.collected) return;
        item.collected = true;
        item.object3D.visible = false;
        this.inventory?.add(item.type);
        this.questManager?.recordCollection(item.id, item.type);
      } else {
        this.activeLandmark = this.nearestInteractable.object;
        this.questManager?.recordLandmarkExplored(this.activeLandmark.id);
        this.player.enabled = false;
      }
      this.update();
    };
    window.addEventListener('keydown', this.onKeyDown);
  }
  loadState(state) {
    const collected = new Set(state?.collectedItemIds ?? []);
    for (const item of this.items) {
      item.collected = collected.has(item.id);
      item.object3D.visible = !item.collected;
    }
    this.update();
  }
  saveState() { return { collectedItemIds: this.items.filter(({ collected }) => collected).map(({ id }) => id) }; }
  setSuspended(value) { this.suspended = value; }
  update() {
    if (this.activeLandmark) return;
    const position = this.player.object3D.position;
    const candidates = [
      ...this.landmarks.map((object) => ({ object, kind: 'landmark' })),
      ...this.items.filter(({ collected }) => !collected).map((object) => ({ object, kind: 'item' })),
    ];
    this.nearestInteractable = candidates
      .map((candidate) => ({
        ...candidate,
        distance: Math.hypot(
          position.x - candidate.object.position.x,
          position.z - candidate.object.position.z,
        ),
      }))
      .filter(({ object, distance }) => distance <= object.interactionDistance)
      .sort((a, b) => a.distance - b.distance)[0] ?? null;
    this.nearestLandmark = this.nearestInteractable?.kind === 'landmark'
      ? this.nearestInteractable.object
      : null;
    this.prompt.hidden = !this.nearestInteractable;
  }
  closeDialog() {
    this.activeLandmark = null;
    this.player.enabled = true;
    this.update();
  }
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.disposed = true;
  }
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

class MemoryStorage {
  constructor(initialValue = null, { failWrites = false } = {}) {
    this.value = initialValue;
    this.failWrites = failWrites;
  }
  getItem() { return this.value; }
  setItem(_key, value) {
    if (this.failWrites) throw new Error('storage quota');
    this.value = value;
  }
  removeItem() { this.value = null; }
}

function createIslandBucket() {
  const bucket = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) bucket[field] = {};
  return bucket;
}

function createSave({ ocean = null, forest = null, mystery = createIslandBucket(), other = null } = {}) {
  const themeProgress = {
    [THEME_IDS.MYSTERY_ISLAND]: mystery,
    ...(forest ? { [THEME_IDS.FOREST]: forest } : {}),
    ...(ocean ? { [THEME_IDS.OCEAN]: ocean } : {}),
    ...(other ? { [THEME_IDS.DINOSAUR]: other } : {}),
  };
  return { version: SAVE_VERSION, characterId: 'girl-explorer', themeProgress, legacyData: { preserved: true } };
}

function createFixture({ sceneFactory, saveData = null, failWrites = false } = {}) {
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  const storage = new MemoryStorage(saveData ? JSON.stringify(saveData) : null, { failWrites });
  const saveManager = new SaveManager({ storage, debounceMs: 60000 });
  const inventoryUI = { disposed: false, dispose() { this.disposed = true; } };
  const runtime = new OceanRuntime({
    ...(sceneFactory ? { sceneFactory } : {}),
    rendererFactory: () => renderer,
    mobileControlsFactory: () => ({ dispose() {} }),
    interactionManagerFactory: (options) => new FakeInteractionManager(options),
    inventoryUIFactory: (options) => { inventoryUI.options = options; return inventoryUI; },
    playerModelLoader: async () => new THREE.Group(),
    clockFactory: () => ({ getDelta: () => 0.1 }),
  });
  let returned = 0;
  return {
    app,
    renderer,
    inventoryUI,
    runtime,
    enter: (window, document) => runtime.enter({
      app,
      character: { id: 'girl-explorer', modelPath: '/player.glb' },
      restoreData: saveData,
      saveManager,
      window,
      document,
      onBack: () => { returned += 1; },
    }),
    storage,
    saveManager,
    cleanup: () => { runtime.exit(); saveManager.clearSave(); },
    get returned() { return returned; },
  };
}

function setCompletedOceanQuests(questManager, completedIds) {
  questManager.loadState({
    progress: Object.fromEntries(OCEAN_QUESTS.map(({ id, target }) => [
      id,
      completedIds.includes(id) ? target : 0,
    ])),
    completed: completedIds,
    collectedItemIds: [],
    exploredLandmarkIds: [],
  });
}

test('OceanRuntime can be created', () => {
  assert.ok(new OceanRuntime() instanceof OceanRuntime);
});

test('Ocean completion uses the existing completion card once and does not replay after a completed save reload', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const ui = fixture.runtime.questCompletionUI;
  const landmarks = fixture.runtime.landmarks;
  const items = fixture.runtime.items;

  for (const landmark of landmarks) fixture.runtime.questManager.recordLandmarkExplored(landmark.id);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(ui.queue.length, 0, 'partial required quests must not open the card');

  for (const item of items) fixture.runtime.questManager.recordCollection(item.id, item.type);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(ui.queue.length, 1, 'all required quests should enqueue one existing completion card');
  assert.equal(ui.isOpen, true);
  assert.equal(ui.title.textContent, '深海探險已完成！');
  assert.match(ui.description.textContent, /三項必要任務皆已完成/);
  assert.equal(ui.backdrop.dataset.kind, 'general');

  fixture.runtime.questManager.recordCollection(items[0].id, items[0].type);
  fixture.runtime.questManager.recordLandmarkExplored(landmarks[0].id);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(ui.queue.length, 1, 'repeated events must not enqueue another card');
  fixture.cleanup();

  const completedOcean = {
    ...createThemeProgress(THEME_STATUSES.COMPLETED),
    quests: {
      progress: Object.fromEntries(OCEAN_QUESTS.map(({ id, target }) => [id, target])),
      completed: OCEAN_QUESTS.map(({ id }) => id),
      collectedItemIds: items.map(({ id }) => id),
      exploredLandmarkIds: landmarks.map(({ id }) => id),
    },
    collections: { collectedItemIds: items.map(({ id }) => id) },
  };
  const restored = createFixture({ saveData: createSave({ ocean: completedOcean }) });
  await restored.enter(window, document);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(restored.runtime.questCompletionUI.queue.length, 0, 'completed Save v2 must not replay the card');
  assert.equal(restored.runtime.completionFeedbackTriggered, true);
  restored.cleanup();
}));

test('Ocean badge stays locked for incomplete required quests and unlocks once with the Ocean completion card', async () => withBrowser(async ({ window, document }) => {
  for (const completed of [[], ['ocean-explorer'], ['ocean-explorer', 'ocean-collector']]) {
    const partial = createFixture();
    await partial.enter(window, document);
    setCompletedOceanQuests(partial.runtime.questManager, completed);
    partial.runtime.showOceanCompletionIfReady();
    assert.equal(partial.runtime.badgeManager.hasBadge('ocean-explorer'), false, completed.join(',') || 'no completed quests');
    partial.cleanup();
  }

  const island = createIslandBucket();
  island.badges = { unlockedIds: ['island-explorer'] };
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), badges: { unlockedIds: ['forest-badge'] } };
  const fixture = createFixture({ saveData: createSave({ mystery: island, forest }) });
  await fixture.enter(window, document);
  const runtime = fixture.runtime;
  for (const landmark of runtime.landmarks) runtime.questManager.recordLandmarkExplored(landmark.id);
  for (const item of runtime.items) runtime.questManager.recordCollection(item.id, item.type);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(BADGES.some(({ id }) => id === 'ocean-explorer'), false, 'Ocean badge stays outside the shared Island badge catalog');
  const badge = runtime.oceanBadge;
  assert.equal(badge.title, '深海探險家');
  assert.equal(badge.description, '完成深海世界的三項主要探險任務。');
  assert.equal(runtime.badgeManager.hasBadge('ocean-explorer'), true);
  assert.equal(runtime.badgeManager.unlockBadge('ocean-explorer'), false);
  assert.equal(runtime.questCompletionUI.badge.hidden, false);
  assert.equal(runtime.questCompletionUI.badge.children[1].textContent, '🌊 深海探險家');
  assert.equal(runtime.showOceanCompletionIfReady(), false);

  const saved = runtime.getSaveData();
  assert.deepEqual(saved.themeProgress[THEME_IDS.OCEAN].badges, { unlockedIds: ['ocean-explorer'] });
  assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND].badges, island.badges);
  assert.deepEqual(saved.themeProgress[THEME_IDS.FOREST].badges, forest.badges);
  assert.equal(fixture.saveManager.save(saved), true);
  fixture.cleanup();

  const restored = createFixture({ saveData: saved });
  await restored.enter(window, document);
  assert.equal(restored.runtime.badgeManager.hasBadge('ocean-explorer'), true);
  assert.equal(restored.runtime.questCompletionUI.queue.length, 0, 'Reload must preserve the badge without replaying completion feedback');
  assert.deepEqual(restored.runtime.getSaveData().themeProgress[THEME_IDS.OCEAN].badges, { unlockedIds: ['ocean-explorer'] });
  assert.deepEqual(restored.runtime.getSaveData().themeProgress[THEME_IDS.MYSTERY_ISLAND].badges, island.badges);
  assert.deepEqual(restored.runtime.getSaveData().themeProgress[THEME_IDS.FOREST].badges, forest.badges);
  restored.cleanup();
}));

test('enter creates the Ocean scene, renderer, camera, and enabled player; exit is idempotent', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.equal(fixture.runtime.scene.name, 'DeepOceanExplorationScene');
  assert.ok(fixture.runtime.renderer);
  assert.ok(fixture.runtime.camera instanceof THREE.PerspectiveCamera);
  assert.equal(fixture.runtime.player.enabled, true);
  assert.equal(typeof fixture.renderer.loop, 'function');
  const interactionManager = fixture.runtime.interactionManager;
  fixture.cleanup();
  fixture.runtime.exit();
  assert.equal(fixture.runtime.isDisposed, true);
  assert.equal(fixture.renderer.loop, null);
  assert.equal(fixture.renderer.disposeCount, 1);
  assert.equal(interactionManager.disposed, true);
  assert.equal(window.listenerCount('resize'), 0);
  assert.equal(window.listenerCount('keydown'), 0);
  assert.equal(window.listenerCount('keyup'), 0);
  assert.equal(fixture.renderer.domElement.parentNode, null);
  fixture.cleanup();
}));

test('OceanRuntime uses createOceanScene and passes its ground height to PlayerController', () => withBrowser(async ({ window, document }) => {
  let sceneCreated = false;
  const fixture = createFixture({ sceneFactory: () => { sceneCreated = true; return createOceanScene(); } });
  await fixture.enter(window, document);
  assert.equal(sceneCreated, true);
  assert.equal(fixture.runtime.scene.name, 'DeepOceanExplorationScene');
  assert.equal(fixture.runtime.groundHeightAt, oceanGroundHeightAt);
  assert.equal(fixture.runtime.player.groundHeightAt, oceanGroundHeightAt);
  assert.equal(fixture.runtime.player.object3D.position.y, oceanGroundHeightAt(0, 0));
  assert.deepEqual(fixture.runtime.landmarks.map(({ id }) => id), OCEAN_LANDMARKS.map(({ id }) => id));
  assert.ok(fixture.runtime.landmarks.every(({ object3D }) => object3D.children.length > 0));
  assert.equal(new Set(fixture.runtime.landmarks.map(({ object3D }) => object3D.name)).size, 3);
  assert.deepEqual(fixture.runtime.items.map(({ id }) => id), OCEAN_COLLECTIBLES.map(({ id }) => id));
  assert.ok(fixture.runtime.items.every(({ object3D }) => object3D.parent === fixture.runtime.scene));
  fixture.cleanup();
}));

test('OceanRuntime creates all configured Ocean collectibles with distinct models and correct IDs', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.deepEqual(fixture.runtime.items.map(({ id }) => id), [
    'ocean-collectible-1',
    'ocean-collectible-2',
    'ocean-collectible-3',
    'ocean-collectible-4',
    'ocean-collectible-5',
  ]);
  assert.deepEqual(fixture.runtime.items.map(({ type }) => type), OCEAN_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.deepEqual(fixture.runtime.inventoryManager.types.map(({ id }) => id), OCEAN_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.equal(fixture.runtime.items.length, 5);
  assert.ok(fixture.runtime.items.every(({ object3D }) => (
    object3D.parent === fixture.runtime.scene && object3D.visible && object3D.children.length > 0
  )));
  assert.equal(new Set(fixture.runtime.items.map(({ object3D }) => object3D.name)).size, 5);
  fixture.cleanup();
}));

test('Ocean loads its three quests into a fresh incomplete runtime-only quest manager', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const quests = fixture.runtime.getQuestSnapshot();
  assert.deepEqual(quests.map(({ id }) => id), OCEAN_QUESTS.map(({ id }) => id));
  assert.ok(quests.every(({ completed, progress }) => !completed && progress === 0));
  assert.deepEqual(quests.map(({ id }) => id), [
    'ocean-explorer',
    'ocean-collector',
    'ocean-discoverer',
  ]);
  fixture.cleanup();
}));

test('Ocean exploration quests use their configured unique-landmark targets and ignore repeated exploration', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const interactWithLandmark = (landmark) => {
    fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
    window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
    fixture.runtime.frame();
    fixture.runtime.interactionManager.closeDialog();
  };
  const quest = (id) => fixture.runtime.getQuestSnapshot().find((entry) => entry.id === id);

  interactWithLandmark(fixture.runtime.landmarks[0]);
  assert.equal(quest('ocean-explorer').progress, 1);
  assert.equal(quest('ocean-explorer').completed, false);
  assert.equal(quest('ocean-discoverer').progress, 1);
  assert.equal(quest('ocean-discoverer').completed, false);
  interactWithLandmark(fixture.runtime.landmarks[0]);
  assert.equal(quest('ocean-explorer').progress, 1);
  assert.equal(quest('ocean-discoverer').progress, 1);
  assert.deepEqual(fixture.runtime.getExploredLandmarkIds(), [fixture.runtime.landmarks[0].id]);

  interactWithLandmark(fixture.runtime.landmarks[1]);
  assert.equal(quest('ocean-discoverer').progress, OCEAN_QUESTS.find(({ id }) => id === 'ocean-discoverer').target);
  assert.equal(quest('ocean-discoverer').completed, true);
  assert.equal(quest('ocean-explorer').completed, false);

  interactWithLandmark(fixture.runtime.landmarks[2]);
  assert.equal(quest('ocean-explorer').progress, OCEAN_QUESTS.find(({ id }) => id === 'ocean-explorer').target);
  assert.equal(quest('ocean-explorer').completed, true);
  fixture.cleanup();
}));

test('Ocean collector quest uses its configured unique-collection target and ignores repeated pickups', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const questDefinition = OCEAN_QUESTS.find(({ id }) => id === 'ocean-collector');
  const quest = () => fixture.runtime.getQuestSnapshot().find(({ id }) => id === questDefinition.id);
  const collect = (item) => {
    fixture.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
    window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
    fixture.runtime.frame();
  };

  for (const item of fixture.runtime.items.slice(0, questDefinition.target - 1)) collect(item);
  assert.equal(quest().progress, questDefinition.target - 1);
  assert.equal(quest().completed, false);
  collect(fixture.runtime.items[0]);
  assert.equal(quest().progress, questDefinition.target - 1);
  assert.equal(quest().completed, false);
  collect(fixture.runtime.items[questDefinition.target - 1]);
  assert.equal(quest().progress, questDefinition.target);
  assert.equal(quest().completed, true);
  assert.equal(new Set(fixture.runtime.getCollectedItemIds()).size, questDefinition.target);
  fixture.cleanup();
}));

test('new Ocean progress saves only to its v2 bucket with landmark, collectible, and quest state', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  for (const landmark of fixture.runtime.landmarks) {
    fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
    window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
    fixture.runtime.frame();
    fixture.runtime.interactionManager.closeDialog();
  }
  for (const item of fixture.runtime.items) {
    fixture.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
    window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
    fixture.runtime.frame();
  }
  fixture.runtime.returnButton.click();

  const saved = JSON.parse(fixture.storage.value);
  const ocean = saved.themeProgress[THEME_IDS.OCEAN];
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(saved.version, 2);
  assert.deepEqual(Object.keys(saved.themeProgress).sort(), [THEME_IDS.MYSTERY_ISLAND, THEME_IDS.OCEAN].sort());
  assert.deepEqual(ocean.quests.exploredLandmarkIds, OCEAN_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(ocean.quests.collectedItemIds, OCEAN_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(ocean.collections.collectedItemIds, OCEAN_COLLECTIBLES.map(({ id }) => id));
  assert.ok(OCEAN_QUESTS.every(({ id }) => ocean.quests.completed.includes(id)));
  assert.deepEqual(ocean.quests.progress, Object.fromEntries(OCEAN_QUESTS.map(({ id, target }) => [id, target])));
  assert.ok(Number.isFinite(ocean.world.player.x));
  assert.ok(Number.isFinite(ocean.world.player.z));
  assert.equal(fixture.returned, 1);
  fixture.cleanup();
}));

test('Ocean save preserves Island, Forest, and every other existing theme bucket exactly', () => withBrowser(async ({ window, document }) => {
  const island = createIslandBucket();
  island.inventory = { counts: { 'ancient-coin': 4 } };
  island.quests = { progress: { collector: 2 }, completed: [] };
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), world: { marker: 'forest-data' } };
  const dinosaur = { ...createThemeProgress(THEME_STATUSES.AVAILABLE), discoveries: { fossil: true } };
  const existingOcean = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), collections: { prior: true } };
  const initial = createSave({ mystery: island, forest, other: dinosaur, ocean: existingOcean });
  const fixture = createFixture({ saveData: initial });
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  fixture.runtime.returnButton.click();

  const saved = JSON.parse(fixture.storage.value);
  assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.deepEqual(saved.themeProgress[THEME_IDS.FOREST], forest);
  assert.deepEqual(saved.themeProgress[THEME_IDS.DINOSAUR], dinosaur);
  assert.deepEqual(saved.legacyData, initial.legacyData);
  assert.deepEqual(saved.themeProgress[THEME_IDS.OCEAN].collections, {
    prior: true,
    collectedItemIds: [],
  });
  assert.deepEqual(saved.themeProgress[THEME_IDS.OCEAN].quests.exploredLandmarkIds, [landmark.id]);
  fixture.cleanup();
}));

test('re-entering Ocean restores landmark, collectible, and quest progress without replaying events', () => withBrowser(async ({ window, document }) => {
  const first = createFixture();
  await first.enter(window, document);
  const landmark = first.runtime.landmarks[0];
  first.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  first.runtime.frame();
  first.runtime.interactionManager.closeDialog();
  const item = first.runtime.items[0];
  first.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  first.runtime.frame();
  first.runtime.returnButton.click();
  const saved = JSON.parse(first.storage.value);
  const persistedOcean = saved.themeProgress[THEME_IDS.OCEAN];
  first.saveManager.clearSave();

  const restored = createFixture({ saveData: saved });
  await restored.enter(window, document);
  const restoredItem = restored.runtime.items.find(({ id }) => id === item.id);
  const restoredExplorer = restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ocean-explorer');
  assert.deepEqual(restored.runtime.getExploredLandmarkIds(), [landmark.id]);
  assert.deepEqual(restored.runtime.getCollectedItemIds(), [item.id]);
  assert.equal(restoredItem.collected, true);
  assert.equal(restoredItem.object3D.visible, false);
  assert.equal(restored.runtime.inventoryManager.getCount(item.type), 1);
  assert.equal(restoredExplorer.progress, 1);
  assert.equal(restored.runtime.questManager.hasExploredLandmark(landmark.id), true);

  restored.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  restored.runtime.frame();
  restored.runtime.interactionManager.closeDialog();
  restored.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  restored.runtime.frame();
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ocean-explorer').progress, 1);
  assert.equal(restored.runtime.getQuestSnapshot().find(({ id }) => id === 'ocean-collector').progress, 1);
  assert.deepEqual(restored.runtime.getCollectedItemIds(), [item.id]);
  assert.deepEqual(persistedOcean.collections.collectedItemIds, [item.id]);
  restored.cleanup();
}));

test('repeated Ocean saves keep unique progress and storage failure preserves existing world data', () => withBrowser(async ({ window, document }) => {
  const island = createIslandBucket();
  island.world = { marker: 'keep-island' };
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), world: { marker: 'keep-forest' } };
  const initial = createSave({ mystery: island, forest });
  const fixture = createFixture({ saveData: initial });
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  const item = fixture.runtime.items[0];
  fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  fixture.runtime.interactionManager.closeDialog();
  fixture.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();

  const firstSave = fixture.runtime.getSaveData();
  assert.equal(fixture.saveManager.save(firstSave), true);
  const secondSave = fixture.runtime.getSaveData();
  assert.equal(fixture.saveManager.save(secondSave), true);
  const repeatedOcean = JSON.parse(fixture.storage.value).themeProgress[THEME_IDS.OCEAN];
  assert.deepEqual(repeatedOcean.quests.exploredLandmarkIds, [landmark.id]);
  assert.deepEqual(repeatedOcean.quests.collectedItemIds, [item.id]);
  assert.deepEqual(repeatedOcean.collections.collectedItemIds, [item.id]);
  fixture.cleanup();

  const protectedInitial = createSave({ mystery: island, forest });
  const failed = createFixture({ saveData: protectedInitial, failWrites: true });
  await failed.enter(window, document);
  failed.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  failed.runtime.frame();
  const unchangedRaw = failed.storage.value;
  failed.runtime.returnButton.click();
  assert.equal(failed.runtime.isActive, true);
  assert.equal(failed.returned, 0);
  assert.equal(failed.storage.value, unchangedRaw);
  assert.deepEqual(JSON.parse(failed.storage.value).themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.deepEqual(JSON.parse(failed.storage.value).themeProgress[THEME_IDS.FOREST], forest);
  failed.cleanup();
}));

test('Ocean completion follows Adventure config required quests and refuses partial or missing quest snapshots', () => withBrowser(async ({ window, document }) => {
  const configuredPolicy = ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.OCEAN).completionPolicy;
  assert.deepEqual(configuredPolicy.questIds, OCEAN_QUESTS.map(({ id }) => id));
  const fixture = createFixture();
  await fixture.enter(window, document);
  const cases = [
    { completed: [], expected: false },
    { completed: ['ocean-explorer'], expected: false },
    { completed: ['ocean-explorer', 'ocean-collector'], expected: false },
    { completed: OCEAN_QUESTS.map(({ id }) => id), expected: true },
  ];
  for (const { completed, expected } of cases) {
    setCompletedOceanQuests(fixture.runtime.questManager, completed);
    const data = fixture.runtime.getSaveData();
    const result = new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress: data.themeProgress,
      questSnapshot: fixture.runtime.getQuestSnapshot(),
    }).evaluateCompletion(THEME_IDS.OCEAN);
    assert.equal(result.completed, expected, completed.join(',') || 'no required quests');
    assert.equal(data.themeProgress[THEME_IDS.OCEAN].status, expected ? THEME_STATUSES.COMPLETED : THEME_STATUSES.IN_PROGRESS);
  }

  setCompletedOceanQuests(fixture.runtime.questManager, OCEAN_QUESTS.map(({ id }) => id));
  const completeSnapshot = fixture.runtime.getQuestSnapshot();
  for (const missingId of configuredPolicy.questIds) {
    const result = new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress: {},
      questSnapshot: completeSnapshot.filter(({ id }) => id !== missingId),
    }).evaluateCompletion(THEME_IDS.OCEAN);
    assert.equal(result.completed, false);
    assert.deepEqual(result.missingQuestIds, [missingId]);
  }
  fixture.cleanup();
}));

test('Ocean completion is saved in v2, survives reload, and leaves Island and Forest buckets unchanged', () => withBrowser(async ({ window, document }) => {
  const island = createIslandBucket();
  island.quests = { progress: { collector: 2 }, completed: [] };
  const forest = { ...createThemeProgress(THEME_STATUSES.IN_PROGRESS), collections: { collectedItemIds: ['forest-item-1'] } };
  const initial = createSave({ mystery: island, forest, ocean: createThemeProgress(THEME_STATUSES.IN_PROGRESS) });
  const fixture = createFixture({ saveData: initial });
  await fixture.enter(window, document);
  setCompletedOceanQuests(fixture.runtime.questManager, OCEAN_QUESTS.map(({ id }) => id));
  const completedData = fixture.runtime.getSaveData();
  assert.equal(fixture.saveManager.save(completedData), true);
  const saved = JSON.parse(fixture.storage.value);
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.deepEqual(saved.themeProgress[THEME_IDS.FOREST], forest);
  assert.equal(saved.themeProgress[THEME_IDS.OCEAN].status, THEME_STATUSES.COMPLETED);
  assert.equal(saved.themeProgress[THEME_IDS.OCEAN].completion.completed, true);
  const completedAt = saved.themeProgress[THEME_IDS.OCEAN].completion.completedAt;
  fixture.cleanup();

  const restored = createFixture({ saveData: saved });
  await restored.enter(window, document);
  const result = new AdventureThemeCompletionManager({
    themes: ADVENTURE_THEMES,
    themeProgress: saved.themeProgress,
    questSnapshot: restored.runtime.getQuestSnapshot(),
  }).evaluateCompletion(THEME_IDS.OCEAN);
  assert.equal(result.completed, true);
  assert.equal(result.completion.completedAt, completedAt);
  const rewritten = restored.runtime.getSaveData();
  assert.equal(rewritten.themeProgress[THEME_IDS.OCEAN].status, THEME_STATUSES.COMPLETED);
  assert.deepEqual(rewritten.themeProgress[THEME_IDS.MYSTERY_ISLAND], island);
  assert.deepEqual(rewritten.themeProgress[THEME_IDS.FOREST], forest);
  restored.cleanup();
}));

test('Ocean collectibles show the existing interaction prompt, E picks them up once, and exit clears them', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const item = fixture.runtime.items[0];
  fixture.runtime.player.object3D.position.set(
    item.position.x,
    oceanGroundHeightAt(item.position.x, item.position.z),
    item.position.z,
  );
  const manager = fixture.runtime.interactionManager;
  manager.update();
  assert.equal(manager.prompt.hidden, false);
  assert.equal(manager.nearestInteractable.kind, 'item');

  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  assert.equal(item.collected, true);
  assert.equal(item.object3D.visible, false);
  assert.equal(fixture.runtime.inventoryManager.getCount(item.type), 1);
  assert.deepEqual(fixture.runtime.getCollectedItemIds(), [item.id]);

  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  assert.deepEqual(fixture.runtime.getCollectedItemIds(), [item.id]);
  assert.equal(item.object3D.visible, false);
  assert.equal(fixture.runtime.inventoryManager.getCount(item.type), 1);

  const itemModel = item.object3D;
  const modelGeometry = itemModel.children[0].geometry;
  let modelGeometryDisposals = 0;
  const disposeGeometry = modelGeometry.dispose.bind(modelGeometry);
  modelGeometry.dispose = () => { modelGeometryDisposals += 1; disposeGeometry(); };
  fixture.cleanup();
  assert.equal(manager.disposed, true);
  assert.ok(modelGeometryDisposals > 0);
  assert.equal(itemModel.visible, false);
  assert.equal(fixture.runtime.items, null);
  assert.equal(fixture.inventoryUI.disposed, true);
  assert.equal(fixture.runtime.inventoryManager, null);
  assert.deepEqual(fixture.runtime.getCollectedItemIds(), []);
  assert.equal(window.listenerCount('keydown'), 0);
}));

test('nearby Ocean landmarks show the prompt and E records the explored landmark ID once', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  fixture.runtime.player.object3D.position.set(
    landmark.position.x,
    oceanGroundHeightAt(landmark.position.x, landmark.position.z),
    landmark.position.z,
  );
  fixture.runtime.interactionManager.update();
  assert.equal(fixture.runtime.interactionManager.prompt.hidden, false);

  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  assert.equal(fixture.runtime.interactionManager.activeLandmark.id, landmark.id);
  assert.deepEqual(fixture.runtime.getExploredLandmarkIds(), [landmark.id]);

  fixture.runtime.interactionManager.closeDialog();
  window.dispatch('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
  fixture.runtime.frame();
  assert.deepEqual(fixture.runtime.getExploredLandmarkIds(), [landmark.id]);
  fixture.cleanup();
}));

test('WASD moves the Ocean player and the camera follows on the game frame', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const startPosition = fixture.runtime.player.object3D.position.clone();
  const startCameraPosition = fixture.runtime.camera.position.clone();
  window.dispatch('keydown', { code: 'KeyW', preventDefault() {} });
  fixture.runtime.frame();
  window.dispatch('keyup', { code: 'KeyW', preventDefault() {} });
  assert.notDeepEqual(fixture.runtime.player.object3D.position.toArray(), startPosition.toArray());
  assert.equal(fixture.runtime.player.object3D.position.y, oceanGroundHeightAt(
    fixture.runtime.player.object3D.position.x,
    fixture.runtime.player.object3D.position.z,
  ));
  assert.notDeepEqual(fixture.runtime.camera.position.toArray(), startCameraPosition.toArray());
  fixture.cleanup();
}));

test('return button exits OceanRuntime and returns to Adventure World once', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const returnButton = fixture.app.children.find((child) => child.attributes.get('aria-label') === '返回冒險世界');
  const interactionManager = fixture.runtime.interactionManager;
  returnButton.click();
  returnButton.click();
  assert.equal(fixture.returned, 1);
  assert.equal(fixture.runtime.isDisposed, true);
  assert.equal(fixture.renderer.loop, null);
  assert.equal(fixture.renderer.disposeCount, 1);
  assert.equal(interactionManager.disposed, true);
}));

test('exit disposes Ocean scene resources and removes resize listener', () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const geometry = fixture.runtime.scene.children.find((child) => child.geometry)?.geometry;
  assert.ok(geometry);
  let geometryDisposals = 0;
  const dispose = geometry.dispose.bind(geometry);
  geometry.dispose = () => { geometryDisposals += 1; dispose(); };
  assert.equal(window.listenerCount('resize'), 1);
  fixture.cleanup();
  assert.equal(geometryDisposals, 1);
  assert.equal(window.listenerCount('resize'), 0);
  assert.equal(fixture.app.children.length, 0);
}));
