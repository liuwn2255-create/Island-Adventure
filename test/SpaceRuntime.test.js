import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import test from 'node:test';
import { SaveManager } from '../src/save/SaveManager.js';
import { SAVE_STORAGE_KEY, SAVE_VERSION } from '../src/save/saveConfig.js';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { SpaceRuntime } from '../src/themes/space/SpaceRuntime.js';
import { MagicCastleRuntime } from '../src/themes/magic-castle/MagicCastleRuntime.js';
import { SPACE_LANDMARKS } from '../src/themes/space/spaceConfig.js';
import { SPACE_COLLECTIBLES, SPACE_COLLECTIBLE_TYPES } from '../src/themes/space/spaceCollectibleConfig.js';
import { SPACE_QUESTS } from '../src/themes/space/spaceQuestConfig.js';

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
  return nextLoad(url, context);
} });

class FakeElement {
  constructor(tagName) { Object.assign(this, { tagName, children: [], listeners: new Map(), attributes: new Map(), style: {}, classes: new Set(), dataset: {}, hidden: false, parentNode: null, textContent: '' }); this.classList = { add: (value) => this.classes.add(value), remove: (value) => this.classes.delete(value) }; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) { if (!this.queries) this.queries = new Map(); if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div')); return this.queries.get(selector); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
  focus() {}
  setPointerCapture() {}
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ preventDefault() {} }); }
}

class FakeWindow {
  innerWidth = 1024; innerHeight = 768; devicePixelRatio = 1; listeners = new Map();
  addEventListener(type, fn) { const set = this.listeners.get(type) ?? new Set(); set.add(fn); this.listeners.set(type, set); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, event) { for (const fn of this.listeners.get(type) ?? []) fn(event); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
  matchMedia() { return { matches: false }; }
  setTimeout() { return 1; }
  clearTimeout() {}
}

class FakeRenderer {
  constructor() { this.domElement = new FakeElement('canvas'); this.shadowMap = {}; this.loop = null; this.disposeCount = 0; }
  setPixelRatio() {} setSize() {} render() {}
  setAnimationLoop(fn) { this.loop = fn; }
  dispose() { this.disposeCount += 1; }
}

class MemoryStorage {
  constructor(value = null) { this.value = value; }
  getItem(key) { return key === SAVE_STORAGE_KEY ? this.value : null; }
  setItem(key, value) { if (key === SAVE_STORAGE_KEY) this.value = value; }
  removeItem(key) { if (key === SAVE_STORAGE_KEY) this.value = null; }
}

function validProgress(status = THEME_STATUSES.AVAILABLE, extra = {}) {
  return { ...createThemeProgress(status), inventory: {}, quests: {}, badges: {}, nature: {}, world: {}, ...extra };
}

function makeBaseSave() {
  return {
    version: SAVE_VERSION,
    characterId: 'space-explorer',
    themeProgress: {
      [THEME_IDS.MYSTERY_ISLAND]: validProgress(),
      [THEME_IDS.FOREST]: validProgress(THEME_STATUSES.IN_PROGRESS, { quests: { preserved: 'forest' } }),
      [THEME_IDS.OCEAN]: validProgress(THEME_STATUSES.IN_PROGRESS, { quests: { preserved: 'ocean' } }),
      [THEME_IDS.DINOSAUR]: validProgress(THEME_STATUSES.IN_PROGRESS, { quests: { preserved: 'dinosaur' } }),
      [THEME_IDS.ANCIENT_DESERT]: validProgress(THEME_STATUSES.IN_PROGRESS, { quests: { preserved: 'desert' } }),
      [THEME_IDS.MAGIC_CASTLE]: validProgress(THEME_STATUSES.AVAILABLE),
    },
    legacyData: { preserved: true, nested: { value: 9 } },
  };
}

async function withBrowser(run) {
  const descriptors = ['window', 'document', 'navigator'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const window = new FakeWindow();
  const document = { createElement: (tag) => new FakeElement(tag) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: 0 } });
  try { return await run({ window, document }); }
  finally { for (const [key, descriptor] of descriptors) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; }
}

function fixture({ storage = new MemoryStorage() } = {}) {
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  const controls = { disposed: 0, dispose() { this.disposed += 1; } };
  const saveManager = new SaveManager({ storage, debounceMs: 60000 });
  const inventoryUI = { disposed: false, dispose() { this.disposed = true; } };
  const runtime = new SpaceRuntime({ rendererFactory: () => renderer, mobileControlsFactory: async () => controls, inventoryUIFactory: (options) => { inventoryUI.options = options; return inventoryUI; }, playerModelLoader: async () => new THREE.Group(), clockFactory: () => ({ getDelta: () => 1 / 30 }) });
  let returned = 0;
  return {
    app, renderer, controls, runtime, saveManager, storage, inventoryUI,
    enter: (window, document) => runtime.enter({ app, character: { id: 'space-explorer', modelPath: '/player.glb' }, window, document, restoreData: saveManager.loadResult().data, saveManager, onBack: () => { returned += 1; } }),
    get returned() { return returned; },
    cleanup({ preserveSave = false } = {}) {
      if (preserveSave) saveManager.flush();
      else saveManager.clearSave();
      runtime.exit();
      if (!preserveSave) saveManager.clearSave();
    },
  };
}

function press(window, code = 'KeyE') { window.dispatch('keydown', { code, repeat: false, preventDefault() {} }); }

test('SpaceRuntime creates its scene, player, camera, landmarks, collectibles, and quests with Save v2 and no AudioManager', async () => withBrowser(async ({ window, document }) => {
  const f = fixture();
  await f.enter(window, document);
  assert.equal(f.runtime.scene.name, 'SpaceAdventureScene');
  assert.ok(f.runtime.camera instanceof THREE.PerspectiveCamera);
  assert.ok(f.runtime.player.object3D);
  assert.equal(f.runtime.player.groundHeightAt, f.runtime.groundHeightAt);
  assert.deepEqual(f.runtime.landmarks.map(({ id }) => id), SPACE_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(f.runtime.items.map(({ id }) => id), SPACE_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(f.runtime.inventoryManager.types.map(({ id }) => id), SPACE_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.deepEqual(f.runtime.getQuestSnapshot().map(({ id }) => id), SPACE_QUESTS.map(({ id }) => id));
  assert.ok(f.runtime.getQuestSnapshot().every(({ progress }) => progress === 0));
  assert.equal(f.runtime.renderer.loop instanceof Function, true);
  assert.equal(f.runtime.saveManager, f.saveManager);
  assert.equal(f.runtime.audioManager, undefined);
  const indicator = f.runtime.directionIndicator;
  assert.ok(indicator);
  f.runtime.frame();
  assert.equal(indicator.element.hidden, false);
  assert.ok(SPACE_LANDMARKS.some(({ name }) => name === indicator.name.textContent));
  f.cleanup();
  assert.equal(indicator.element.parentNode, null);
}));

test('SpaceRuntime supports WASD movement, camera follow, and resize', async () => withBrowser(async ({ window, document }) => {
  const f = fixture(); await f.enter(window, document);
  const start = f.runtime.player.object3D.position.clone();
  window.dispatch('keydown', { code: 'KeyW', preventDefault() {} }); f.runtime.frame();
  window.dispatch('keyup', { code: 'KeyW', preventDefault() {} });
  assert.notDeepEqual(f.runtime.player.object3D.position.toArray(), start.toArray());
  assert.equal(f.runtime.player.object3D.position.y, f.runtime.groundHeightAt(start.x, start.z));
  window.innerWidth = 800; window.innerHeight = 600; window.dispatch('resize', {});
  assert.equal(f.runtime.camera.aspect, 4 / 3);
  f.cleanup();
}));

test('E explores a Space landmark once and updates both landmark quests', async () => withBrowser(async ({ window, document }) => {
  const f = fixture(); await f.enter(window, document);
  const landmark = f.runtime.landmarks[0];
  f.runtime.player.object3D.position.set(landmark.position.x, f.runtime.groundHeightAt(landmark.position.x, landmark.position.z), landmark.position.z);
  f.runtime.interactionManager.update(); press(window);
  assert.equal(f.runtime.questManager.hasExploredLandmark(landmark.id), true);
  assert.equal(f.runtime.getQuestSnapshot()[0].progress, 1);
  assert.equal(f.runtime.getQuestSnapshot()[2].progress, 1);
  f.runtime.interactionManager.closeDialog(); press(window);
  assert.equal(f.runtime.getQuestSnapshot()[0].progress, 1);
  f.cleanup();
}));

test('E collects a Space item once, hides its model, and advances the collector quest', async () => withBrowser(async ({ window, document }) => {
  const f = fixture(); await f.enter(window, document);
  const item = f.runtime.items[0];
  f.runtime.player.object3D.position.set(item.position.x, item.position.y, item.position.z);
  f.runtime.interactionManager.update(); press(window);
  assert.equal(item.collected, true);
  assert.equal(item.object3D.visible, false);
  assert.equal(f.runtime.questManager.hasCollectedItem(item.id), true);
  assert.equal(f.runtime.getQuestSnapshot()[1].progress, 1);
  assert.equal(f.runtime.inventoryManager.getCount(item.type), 1);
  press(window);
  assert.equal(f.runtime.getQuestSnapshot()[1].progress, 1);
  f.cleanup();
}));

test('return and exit clean interaction, renderer, controls, listeners, and Space UI', async () => withBrowser(async ({ window, document }) => {
  const f = fixture(); await f.enter(window, document);
  const resizeListenersBefore = window.count('resize');
  assert.equal(resizeListenersBefore, 1);
  f.runtime.returnButton.click();
  assert.equal(f.returned, 1);
  const saved = JSON.parse(f.storage.value);
  assert.equal(saved.version, SAVE_VERSION);
  assert.ok(saved.themeProgress[THEME_IDS.SPACE]);
  assert.equal(f.runtime.isDisposed, true);
  assert.equal(f.renderer.loop, null);
  assert.equal(f.renderer.disposeCount, 1);
  assert.equal(f.controls.disposed, 1);
  assert.equal(window.count('resize'), 0);
  assert.equal(window.count('keydown'), 0);
  assert.equal(f.app.children.length, 0);
  assert.equal(f.inventoryUI.disposed, true);
  assert.equal(f.runtime.inventoryManager, null);
  f.cleanup({ preserveSave: true });
  assert.equal(f.returned, 1);
}));

test('main routes Space and Magic Castle to their dedicated Runtimes', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ SpaceRuntime \} from '\.\/themes\/space\/SpaceRuntime\.js';/);
  assert.match(source, /themeRuntimeRegistry\.register\(THEME_IDS\.SPACE, \(\) => new SpaceRuntime\(/);
  assert.match(source, /import \{ MagicCastleRuntime \} from '\.\/themes\/magic-castle\/MagicCastleRuntime\.js';/);
  assert.match(source, /themeRuntimeRegistry\.register\(THEME_IDS\.MAGIC_CASTLE, \(\) => new MagicCastleRuntime\(/);
  assert.match(source, /id !== THEME_IDS\.MAGIC_CASTLE/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.SPACE\)[\s\S]*?activeThemeRuntime\.enter\(/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.SPACE\)[\s\S]*?restoreData: latestData,[\s\S]*?saveManager,/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.MAGIC_CASTLE\)[\s\S]*?activeThemeRuntime\.enter\(/);
  assert.doesNotMatch(source, /THEME_IDS\.MAGIC_CASTLE, \(\) => new PlaceholderThemeRuntime/);
});

test('Space Save v2 writes only themeProgress.space and preserves every other bucket and legacyData', async () => withBrowser(async ({ window, document }) => {
  const original = makeBaseSave();
  const storage = new MemoryStorage(JSON.stringify(original));
  const f = fixture({ storage }); await f.enter(window, document);
  const landmark = f.runtime.landmarks[0];
  f.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  f.runtime.interactionManager.update(); press(window); f.runtime.interactionManager.closeDialog();
  const item = f.runtime.items[0];
  f.runtime.player.object3D.position.set(item.position.x, 0, item.position.z);
  f.runtime.interactionManager.update(); press(window);
  f.runtime.player.object3D.position.set(3, 0, 4);
  f.runtime.player.object3D.rotation.y = 0.75;
  assert.equal(f.runtime.returnToAdventureWorld(), true);
  const saved = JSON.parse(storage.value);
  assert.equal(saved.version, 2);
  assert.ok(saved.themeProgress.space);
  for (const themeId of [THEME_IDS.MYSTERY_ISLAND, THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.ANCIENT_DESERT, THEME_IDS.MAGIC_CASTLE]) {
    assert.deepEqual(saved.themeProgress[themeId], original.themeProgress[themeId], `${themeId} bucket changed`);
  }
  assert.deepEqual(saved.legacyData, original.legacyData);
  assert.deepEqual(saved.themeProgress.space.quests.exploredLandmarkIds, [landmark.id]);
  assert.deepEqual(saved.themeProgress.space.quests.collectedItemIds, [item.id]);
  assert.equal(saved.themeProgress.space.quests.progress['space-explorer'], 1);
  assert.equal(saved.themeProgress.space.quests.progress['space-collector'], 1);
  assert.deepEqual(saved.themeProgress.space.collections.collectedItemIds, [item.id]);
  assert.deepEqual(saved.themeProgress.space.world.player, { x: 3, z: 4, rotationY: 0.75 });
  f.cleanup({ preserveSave: true });
}));

test('Reload or Continue restores Space quests, explored landmarks, collected items, and player transform', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeBaseSave()));
  const first = fixture({ storage }); await first.enter(window, document);
  const landmark = first.runtime.landmarks[0];
  first.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  first.runtime.interactionManager.update(); press(window); first.runtime.interactionManager.closeDialog();
  const item = first.runtime.items[0];
  first.runtime.player.object3D.position.set(item.position.x, 0, item.position.z);
  first.runtime.interactionManager.update(); press(window);
  first.runtime.player.object3D.position.set(2.5, 0, -3.5);
  first.runtime.player.object3D.rotation.y = -0.4;
  first.runtime.returnToAdventureWorld();

  const second = fixture({ storage }); await second.enter(window, document);
  assert.equal(second.runtime.questManager.hasExploredLandmark(landmark.id), true);
  assert.equal(second.runtime.questManager.hasCollectedItem(item.id), true);
  assert.equal(second.runtime.getQuestSnapshot()[0].progress, 1);
  assert.equal(second.runtime.getQuestSnapshot()[1].progress, 1);
  assert.equal(second.runtime.getQuestSnapshot()[2].progress, 1);
  assert.equal(second.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  assert.equal(second.runtime.inventoryManager.getCount(item.type), 1);
  assert.deepEqual(second.runtime.player.object3D.position.toArray(), [2.5, 0, -3.5]);
  assert.equal(second.runtime.player.object3D.rotation.y, -0.4);
  const before = second.runtime.getQuestSnapshot()[0].progress;
  const restoredLandmark = second.runtime.landmarks.find(({ id }) => id === landmark.id);
  second.runtime.player.object3D.position.set(restoredLandmark.position.x, 0, restoredLandmark.position.z);
  second.runtime.interactionManager.update(); press(window);
  assert.equal(second.runtime.getQuestSnapshot()[0].progress, before);
  second.runtime.interactionManager.closeDialog();
  second.cleanup({ preserveSave: true });
}));

test('Space completion remains false for 0/3, 1/3, and 2/3 quests and persists the shared manager result at 3/3', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeBaseSave()));
  const f = fixture({ storage }); await f.enter(window, document);
  const incompleteStates = [
    { progress: {}, completed: [] },
    { progress: { 'space-explorer': 3 }, completed: ['space-explorer'] },
    { progress: { 'space-explorer': 3, 'space-collector': 5 }, completed: ['space-explorer', 'space-collector'] },
  ];
  for (const state of incompleteStates) {
    f.runtime.questManager.loadState(state);
    const data = f.runtime.getSaveData();
    assert.equal(f.runtime.evaluateSpaceCompletion().completed, false);
    assert.equal(data.themeProgress.space.status, THEME_STATUSES.IN_PROGRESS);
    assert.equal(data.themeProgress.space.completion, null);
  }

  const completedIds = SPACE_QUESTS.map(({ id }) => id);
  f.runtime.questManager.loadState({
    progress: { 'space-explorer': 3, 'space-collector': 5, 'space-discoverer': 2 },
    completed: completedIds,
    exploredLandmarkIds: SPACE_LANDMARKS.map(({ id }) => id),
    collectedItemIds: SPACE_COLLECTIBLES.map(({ id }) => id),
  });
  const completedData = f.runtime.getSaveData();
  assert.equal(f.runtime.evaluateSpaceCompletion().completed, true);
  assert.equal(completedData.themeProgress.space.status, THEME_STATUSES.COMPLETED);
  assert.deepEqual(completedData.themeProgress.space.completion, {
    completed: true,
    completedAt: completedData.themeProgress.space.completion.completedAt,
    completionPolicy: 'required-quests',
  });
  assert.equal(f.saveManager.save(completedData), true);
  const completion = completedData.themeProgress.space.completion;
  f.cleanup({ preserveSave: true });

  const reloaded = fixture({ storage }); await reloaded.enter(window, document);
  assert.equal(reloaded.runtime.evaluateSpaceCompletion().completed, true);
  assert.deepEqual(reloaded.runtime.getSaveData().themeProgress.space.completion, completion);
  assert.equal(JSON.parse(storage.value).themeProgress.space.status, THEME_STATUSES.COMPLETED);
  reloaded.cleanup({ preserveSave: true });
}));

test('Space completion card and badge trigger once, save in the Space bucket, and do not replay after reload', async () => withBrowser(async ({ window, document }) => {
  const original = makeBaseSave();
  original.themeProgress[THEME_IDS.MYSTERY_ISLAND].badges = { unlockedIds: ['island-explorer'] };
  original.themeProgress[THEME_IDS.FOREST].badges = { unlockedIds: ['forest-explorer'] };
  original.themeProgress[THEME_IDS.OCEAN].badges = { unlockedIds: ['ocean-explorer'] };
  const expectedOtherBadges = Object.fromEntries(
    [THEME_IDS.MYSTERY_ISLAND, THEME_IDS.FOREST, THEME_IDS.OCEAN].map((id) => [id, original.themeProgress[id].badges]),
  );
  const storage = new MemoryStorage(JSON.stringify(original));
  const f = fixture({ storage });
  await f.enter(window, document);
  const runtime = f.runtime;
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  for (const landmark of runtime.landmarks) runtime.questManager.recordLandmarkExplored(landmark.id);
  assert.equal(runtime.getQuestSnapshot().filter(({ completed }) => completed).length, 2);
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  assert.equal(runtime.badgeManager.hasBadge('space-explorer'), false);
  for (const item of runtime.items.slice(0, -1)) runtime.questManager.recordCollection(item.id, item.type);
  assert.equal(runtime.questCompletionUI.queue.length, 0);
  assert.equal(runtime.badgeManager.hasBadge('space-explorer'), false);
  runtime.questManager.recordCollection(runtime.items.at(-1).id, runtime.items.at(-1).type);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(runtime.evaluateSpaceCompletion().completed, true);
  assert.equal(runtime.questCompletionUI.queue.length, 1);
  assert.equal(runtime.questCompletionUI.title.textContent, '太空冒險完成！');
  assert.equal(runtime.questCompletionUI.isOpen, true);
  assert.equal(runtime.badgeManager.hasBadge('space-explorer'), true);
  assert.equal(runtime.spaceBadge.title, '太空冒險家');
  assert.equal(runtime.questCompletionUI.badge.hidden, false);
  assert.equal(runtime.questCompletionUI.badge.children[1].textContent, '🚀 太空冒險家');
  assert.equal(runtime.showSpaceCompletionIfReady(), false);
  assert.equal(runtime.questCompletionUI.queue.length, 1);

  const saved = runtime.getSaveData();
  assert.deepEqual(saved.themeProgress[THEME_IDS.SPACE].badges, { unlockedIds: ['space-explorer'] });
  for (const [id, badges] of Object.entries(expectedOtherBadges)) assert.deepEqual(saved.themeProgress[id].badges, badges);
  assert.equal(f.saveManager.save(saved), true);
  f.cleanup({ preserveSave: true });

  const reloaded = fixture({ storage });
  await reloaded.enter(window, document);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(reloaded.runtime.badgeManager.hasBadge('space-explorer'), true);
  assert.deepEqual(reloaded.runtime.getSaveData().themeProgress[THEME_IDS.SPACE].badges, { unlockedIds: ['space-explorer'] });
  assert.equal(reloaded.runtime.completionFeedbackTriggered, true);
  assert.equal(reloaded.runtime.questCompletionUI.queue.length, 0);
  for (const [id, badges] of Object.entries(expectedOtherBadges)) assert.deepEqual(reloaded.runtime.getSaveData().themeProgress[id].badges, badges);
  reloaded.cleanup({ preserveSave: true });
}));
