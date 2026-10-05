import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import test from 'node:test';
import { createThemeProgress, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { SaveManager } from '../src/save/SaveManager.js';
import { MagicCastleRuntime } from '../src/themes/magic-castle/MagicCastleRuntime.js';
import { MAGIC_CASTLE_LANDMARKS } from '../src/themes/magic-castle/magicCastleConfig.js';
import { MAGIC_CASTLE_COLLECTIBLES } from '../src/themes/magic-castle/magicCastleConfig.js';
import { MAGIC_CASTLE_COLLECTIBLE_TYPES } from '../src/themes/magic-castle/magicCastleCollectibleConfig.js';
import { MAGIC_CASTLE_QUESTS } from '../src/themes/magic-castle/magicCastleQuestConfig.js';

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
  return nextLoad(url, context);
} });

class FakeElement {
  constructor(tagName) {
    Object.assign(this, { tagName, children: [], listeners: new Map(), attributes: new Map(), style: {}, classes: new Set(), parentNode: null, textContent: '' });
    this.classList = { add: (value) => this.classes.add(value), remove: (value) => this.classes.delete(value) };
  }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) { this.queries ??= new Map(); if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement('div')); return this.queries.get(selector); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
  focus() {}
  setPointerCapture() {}
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ preventDefault() {} }); }
}

class FakeWindow {
  innerWidth = 1024;
  innerHeight = 768;
  devicePixelRatio = 1;
  listeners = new Map();
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
  matchMedia() { return { matches: false }; }
  setTimeout() { return 1; }
  clearTimeout() {}
}

class FakeRenderer {
  constructor() { this.domElement = new FakeElement('canvas'); this.shadowMap = {}; this.loop = null; this.disposeCount = 0; }
  setPixelRatio() {}
  setSize() {}
  render() {}
  setAnimationLoop(loop) { this.loop = loop; }
  dispose() { this.disposeCount += 1; }
}

class MemoryStorage {
  constructor(value = null) { this.value = value; }
  getItem() { return this.value; }
  setItem(_key, value) { this.value = value; }
  removeItem() { this.value = null; }
}

function makeValidSave() {
  const island = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) island[field] = {};
  const themeProgress = { [THEME_IDS.MYSTERY_ISLAND]: island };
  for (const id of [THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.ANCIENT_DESERT, THEME_IDS.SPACE]) {
    themeProgress[id] = createThemeProgress(THEME_STATUSES.IN_PROGRESS);
  }
  themeProgress[THEME_IDS.FOREST].quests = { marker: 'forest-preserved' };
  themeProgress[THEME_IDS.OCEAN].quests = { marker: 'ocean-preserved' };
  themeProgress[THEME_IDS.DINOSAUR].quests = { marker: 'dinosaur-preserved' };
  themeProgress[THEME_IDS.ANCIENT_DESERT].quests = { marker: 'desert-preserved' };
  themeProgress[THEME_IDS.SPACE].quests = { marker: 'space-preserved' };
  for (const id of [THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.ANCIENT_DESERT, THEME_IDS.SPACE]) {
    themeProgress[id].badges = { unlockedIds: [`${id}-badge-marker`] };
  }
  return { version: SAVE_VERSION, characterId: 'mage', themeProgress, legacyData: { preserve: 'legacy-marker' } };
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

function createFixture({ storage = new MemoryStorage(JSON.stringify(makeValidSave())) } = {}) {
  const app = new FakeElement('main');
  const renderer = new FakeRenderer();
  const controls = { disposed: 0, dispose() { this.disposed += 1; } };
  const completionCards = [];
  const completionUI = {
    update() {}, dispose() { this.disposed = (this.disposed ?? 0) + 1; },
  };
  const inventoryUI = { disposed: false, dispose() { this.disposed = true; } };
  const saveManager = new SaveManager({ storage, debounceMs: 60000 });
  const runtime = new MagicCastleRuntime({
    rendererFactory: () => renderer,
    mobileControlsFactory: async () => controls,
    inventoryUIFactory: (options) => { inventoryUI.options = options; return inventoryUI; },
    questCompletionUIFactory: async (options) => {
      options.questManager.subscribeCompleted((quest) => {
        completionCards.push({ quest, badge: options.getBadgeForCompletion(quest) });
      });
      return completionUI;
    },
    playerModelLoader: async () => new THREE.Group(),
    clockFactory: () => ({ getDelta: () => 1 / 30 }),
  });
  let returned = 0;
  return {
    app, renderer, controls, runtime, saveManager, storage, completionCards, completionUI, inventoryUI,
    enter: (window, document) => runtime.enter({ app, character: { id: 'mage', modelPath: '/mage.glb' }, saveManager, restoreData: saveManager.loadResult().data, window, document, onBack: () => { returned += 1; } }),
    get returned() { return returned; },
  };
}

function press(window, code = 'KeyE') { window.dispatch('keydown', { code, repeat: false, preventDefault() {} }); }

test('MagicCastleRuntime builds the standalone scene, player, three landmarks, five collectibles, and three quests', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const runtime = fixture.runtime;
  assert.equal(runtime.scene.name, 'MagicCastleScene');
  assert.ok(runtime.camera instanceof THREE.PerspectiveCamera);
  assert.ok(runtime.player.object3D);
  assert.equal(runtime.player.groundHeightAt, runtime.groundHeightAt);
  assert.deepEqual(runtime.landmarks.map(({ id }) => id), MAGIC_CASTLE_LANDMARKS.map(({ id }) => id));
  assert.deepEqual(runtime.items.map(({ id }) => id), MAGIC_CASTLE_COLLECTIBLES.map(({ id }) => id));
  assert.deepEqual(runtime.inventoryManager.types.map(({ id }) => id), MAGIC_CASTLE_COLLECTIBLE_TYPES.map(({ id }) => id));
  assert.deepEqual(runtime.getQuestSnapshot().map(({ id }) => id), MAGIC_CASTLE_QUESTS.map(({ id }) => id));
  assert.equal(runtime.renderer.loop instanceof Function, true);
  assert.equal(runtime.saveManager, fixture.saveManager);
  assert.equal(runtime.audioManager, undefined);
  assert.ok(runtime.badgeManager);
  assert.equal(runtime.questCompletionUI, fixture.completionUI);
  fixture.runtime.exit();
  fixture.saveManager.clearSave();
}));

test('Magic Castle enables WASD movement, follows the player, and updates renderer size on resize', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const start = fixture.runtime.player.object3D.position.clone();
  window.dispatch('keydown', { code: 'KeyW', preventDefault() {} }); fixture.runtime.frame();
  window.dispatch('keyup', { code: 'KeyW', preventDefault() {} });
  assert.notDeepEqual(fixture.runtime.player.object3D.position.toArray(), start.toArray());
  assert.equal(fixture.runtime.player.object3D.position.y, fixture.runtime.groundHeightAt(start.x, start.z));
  window.innerWidth = 800; window.innerHeight = 600; window.dispatch('resize', {});
  assert.equal(fixture.runtime.camera.aspect, 4 / 3);
  fixture.runtime.exit();
  fixture.saveManager.clearSave();
}));

test('E explores each Magic Castle landmark once and updates the landmark quest progress', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  fixture.runtime.interactionManager.update(); press(window);
  assert.equal(fixture.runtime.questManager.hasExploredLandmark(landmark.id), true);
  assert.equal(fixture.runtime.getQuestSnapshot()[0].progress, 1);
  assert.equal(fixture.runtime.getQuestSnapshot()[2].progress, 1);
  fixture.runtime.interactionManager.closeDialog(); press(window);
  assert.equal(fixture.runtime.getQuestSnapshot()[0].progress, 1);
  fixture.runtime.exit();
  fixture.saveManager.clearSave();
}));

test('E picks up each Magic Castle collectible once, hides it, and advances collector progress', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const item = fixture.runtime.items[0];
  fixture.runtime.player.object3D.position.set(item.position.x, 0, item.position.z);
  fixture.runtime.interactionManager.update(); press(window);
  assert.equal(item.collected, true);
  assert.equal(item.object3D.visible, false);
  assert.equal(fixture.runtime.questManager.hasCollectedItem(item.id), true);
  assert.equal(fixture.runtime.getQuestSnapshot()[1].progress, 1);
  assert.equal(fixture.runtime.inventoryManager.getCount(item.type), 1);
  assert.equal(fixture.inventoryUI.options.inventory, fixture.runtime.inventoryManager);
  press(window);
  assert.equal(fixture.runtime.getQuestSnapshot()[1].progress, 1);
  fixture.runtime.exit();
  fixture.saveManager.clearSave();
}));

test('Magic Castle return and cleanup stops the loop and removes controls, runtime UI, and event listeners', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  assert.equal(window.count('resize'), 1);
  assert.equal(window.count('keydown'), 2, 'player and InteractionManager each register one keyboard listener');
  fixture.runtime.returnButton.click();
  assert.equal(fixture.returned, 1);
  assert.equal(fixture.runtime.isDisposed, true);
  assert.equal(fixture.renderer.loop, null);
  assert.equal(fixture.renderer.disposeCount, 1);
  assert.equal(fixture.controls.disposed, 1);
  assert.equal(window.count('resize'), 0);
  assert.equal(window.count('keydown'), 0);
  assert.equal(window.count('keyup'), 0);
  assert.equal(fixture.app.children.length, 0);
  assert.equal(fixture.runtime.returnToAdventureWorld(), false);
  assert.equal(fixture.saveManager.loadResult().ok, true);
  fixture.saveManager.clearSave();
}));

test('Magic Castle persists progress only to its own v2 bucket and restores quest, discovery, collectible, and player state', async () => withBrowser(async ({ window, document }) => {
  const original = makeValidSave();
  const storage = new MemoryStorage(JSON.stringify(original));
  const fixture = createFixture({ storage });
  await fixture.enter(window, document);
  const landmark = fixture.runtime.landmarks[0];
  fixture.runtime.player.object3D.position.set(landmark.position.x, 0, landmark.position.z);
  fixture.runtime.interactionManager.update(); press(window);
  fixture.runtime.interactionManager.closeDialog();
  const item = fixture.runtime.items[0];
  fixture.runtime.player.object3D.position.set(item.position.x, 0, item.position.z);
  fixture.runtime.interactionManager.update(); press(window);
  fixture.runtime.player.object3D.position.set(2, fixture.runtime.groundHeightAt(2, 3), 3);
  fixture.runtime.player.object3D.rotation.y = 1.25;
  assert.equal(fixture.runtime.returnToAdventureWorld(), true);

  const saved = JSON.parse(storage.value);
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.legacyData, original.legacyData);
  for (const id of [THEME_IDS.MYSTERY_ISLAND, THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.ANCIENT_DESERT, THEME_IDS.SPACE]) {
    assert.deepEqual(saved.themeProgress[id], original.themeProgress[id], `${id} bucket must be preserved`);
  }
  const castle = saved.themeProgress[THEME_IDS.MAGIC_CASTLE];
  assert.deepEqual(castle.quests.exploredLandmarkIds, [landmark.id]);
  assert.deepEqual(castle.quests.collectedItemIds, [item.id]);
  assert.equal(castle.quests.progress['magic-castle-explorer'], 1);
  assert.equal(castle.quests.progress['magic-castle-collector'], 1);
  assert.equal(castle.collections.collectedItemIds.includes(item.id), true);
  assert.deepEqual(castle.world.player, { x: 2, z: 3, rotationY: 1.25 });
  assert.equal(castle.status, THEME_STATUSES.IN_PROGRESS);
  assert.equal(castle.completion, null);

  const restored = createFixture({ storage });
  await restored.enter(window, document);
  assert.equal(restored.runtime.questManager.hasExploredLandmark(landmark.id), true);
  assert.equal(restored.runtime.questManager.hasCollectedItem(item.id), true);
  assert.equal(restored.runtime.inventoryManager.getCount(item.type), 1);
  assert.equal(restored.runtime.items.find(({ id }) => id === item.id).object3D.visible, false);
  assert.equal(restored.runtime.getQuestSnapshot()[0].progress, 1);
  assert.equal(restored.runtime.player.object3D.position.x, 2);
  assert.equal(restored.runtime.player.object3D.position.z, 3);
  assert.equal(restored.runtime.player.object3D.rotation.y, 1.25);
  restored.runtime.exit();
  assert.equal(restored.runtime.isDisposed, true);
  assert.equal(restored.inventoryUI.disposed, true);
  restored.saveManager.clearSave();
}));

test('Magic Castle completion UI and badge trigger once only after all required quests finish', async () => withBrowser(async ({ window, document }) => {
  const fixture = createFixture();
  await fixture.enter(window, document);
  const quests = fixture.runtime.questManager;
  assert.equal(fixture.runtime.evaluateMagicCastleCompletion().completed, false);
  assert.equal(fixture.completionCards.length, 0);
  assert.equal(fixture.runtime.badgeManager.hasBadge('magic-castle-explorer'), false);

  quests.recordLandmarkExplored('magic-castle');
  assert.equal(fixture.runtime.evaluateMagicCastleCompletion().completed, false);
  quests.recordCollection('magic-collectible-1', 'collectible');
  quests.recordCollection('magic-collectible-2', 'collectible');
  quests.recordCollection('magic-collectible-3', 'collectible');
  quests.recordCollection('magic-collectible-4', 'collectible');
  quests.recordCollection('magic-collectible-5', 'collectible');
  assert.equal(fixture.runtime.evaluateMagicCastleCompletion().completed, false);
  assert.equal(fixture.completionCards.length, 0);
  assert.equal(fixture.runtime.badgeManager.hasBadge('magic-castle-explorer'), false);

  quests.recordLandmarkExplored('wizard-tower');
  assert.equal(quests.getSnapshot().filter(({ completed }) => completed).length, 2);
  assert.equal(fixture.completionCards.length, 0);
  assert.equal(fixture.runtime.badgeManager.hasBadge('magic-castle-explorer'), false);
  quests.recordLandmarkExplored('enchanted-garden');

  assert.equal(fixture.runtime.evaluateMagicCastleCompletion().completed, true);
  assert.equal(fixture.completionCards.length, 1);
  assert.equal(fixture.completionCards[0].quest.title, '魔法城堡探險完成！');
  assert.equal(fixture.completionCards[0].quest.completed, true);
  assert.equal(fixture.completionCards[0].badge.id, 'magic-castle-explorer');
  assert.equal(fixture.completionCards[0].badge.title, '魔法城堡探險家');
  assert.equal(fixture.runtime.badgeManager.getBadges().length, 1);
  assert.equal(fixture.runtime.showMagicCastleCompletionIfReady(), false);
  assert.equal(fixture.completionCards.length, 1);
  fixture.runtime.exit();
  fixture.saveManager.clearSave();
}));

test('Magic Castle badge saves in its bucket, survives reload, and completed re-entry does not replay or unlock again', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeValidSave()));
  const first = createFixture({ storage });
  await first.enter(window, document);
  const quests = first.runtime.questManager;
  quests.recordLandmarkExplored('magic-castle');
  quests.recordCollection('magic-collectible-1', 'collectible');
  quests.recordCollection('magic-collectible-2', 'collectible');
  quests.recordCollection('magic-collectible-3', 'collectible');
  quests.recordCollection('magic-collectible-4', 'collectible');
  quests.recordCollection('magic-collectible-5', 'collectible');
  quests.recordLandmarkExplored('wizard-tower');
  quests.recordLandmarkExplored('enchanted-garden');
  assert.equal(first.completionCards.length, 1);
  assert.equal(first.runtime.returnToAdventureWorld(), true);

  const stored = JSON.parse(storage.value);
  assert.deepEqual(stored.themeProgress[THEME_IDS.MAGIC_CASTLE].badges.unlockedIds, ['magic-castle-explorer']);
  for (const id of [THEME_IDS.FOREST, THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.ANCIENT_DESERT, THEME_IDS.SPACE]) {
    assert.deepEqual(stored.themeProgress[id].badges, { unlockedIds: [`${id}-badge-marker`] });
  }

  const continued = createFixture({ storage });
  await continued.enter(window, document);
  assert.equal(continued.runtime.completionFeedbackTriggered, true);
  assert.equal(continued.runtime.badgeManager.hasBadge('magic-castle-explorer'), true);
  assert.equal(continued.runtime.badgeManager.getBadges().length, 1);
  assert.equal(continued.runtime.showMagicCastleCompletionIfReady(), false);
  assert.equal(continued.completionCards.length, 0);
  assert.equal(continued.runtime.returnToAdventureWorld(), true);
  const afterContinue = JSON.parse(storage.value);
  assert.deepEqual(afterContinue.themeProgress[THEME_IDS.MAGIC_CASTLE].badges.unlockedIds, ['magic-castle-explorer']);
  continued.saveManager.clearSave();
}));

test('Magic Castle completes only with all three required quests and persists completion across reload', async () => withBrowser(async ({ window, document }) => {
  const storage = new MemoryStorage(JSON.stringify(makeValidSave()));
  const fixture = createFixture({ storage });
  await fixture.enter(window, document);
  const manager = fixture.runtime.questManager;
  const ids = fixture.runtime.landmarks.map(({ id }) => id);
  for (const questCount of [0, 1, 2]) {
    const progress = {
      progress: {
        'magic-castle-explorer': questCount >= 1 ? 3 : 0,
        'magic-castle-collector': questCount >= 2 ? 5 : 0,
        'magic-castle-discoverer': questCount >= 3 ? 2 : 0,
      },
      completed: [], collectedItemIds: [], exploredLandmarkIds: [],
    };
    manager.loadState(progress);
    assert.equal(fixture.runtime.evaluateMagicCastleCompletion().completed, false, `${questCount}/3 must remain incomplete`);
  }
  manager.loadState({
    progress: { 'magic-castle-explorer': 3, 'magic-castle-collector': 5, 'magic-castle-discoverer': 2 },
    completed: MAGIC_CASTLE_QUESTS.map(({ id }) => id),
    collectedItemIds: [], exploredLandmarkIds: ids,
  });
  const completion = fixture.runtime.evaluateMagicCastleCompletion();
  assert.equal(completion.completed, true);
  assert.equal(completion.completion.completionPolicy, 'required-quests');
  assert.equal(fixture.runtime.returnToAdventureWorld(), true);
  let saved = JSON.parse(storage.value);
  assert.equal(saved.themeProgress[THEME_IDS.MAGIC_CASTLE].status, THEME_STATUSES.COMPLETED);
  assert.equal(saved.themeProgress[THEME_IDS.MAGIC_CASTLE].completion.completed, true);

  const restored = createFixture({ storage });
  await restored.enter(window, document);
  const afterReload = restored.runtime.evaluateMagicCastleCompletion();
  assert.equal(afterReload.completed, true);
  assert.deepEqual(afterReload.completion, saved.themeProgress[THEME_IDS.MAGIC_CASTLE].completion);
  restored.runtime.exit();
  restored.saveManager.clearSave();
}));

test('main routes Magic Castle to MagicCastleRuntime while Space and all playable worlds keep their existing routes', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ MagicCastleRuntime \} from '\.\/themes\/magic-castle\/MagicCastleRuntime\.js';/);
  assert.match(source, /themeRuntimeRegistry\.register\(THEME_IDS\.MAGIC_CASTLE, \(\) => new MagicCastleRuntime\(/);
  assert.match(source, /id !== THEME_IDS\.MAGIC_CASTLE/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.MAGIC_CASTLE\)[\s\S]*?activeThemeRuntime\.enter\(/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.MAGIC_CASTLE\)[\s\S]*?restoreData: latestData,[\s\S]*?saveManager,/);
  assert.match(source, /themeRuntimeRegistry\.register\(THEME_IDS\.SPACE, \(\) => new SpaceRuntime\(/);
  for (const themeId of ['FOREST', 'OCEAN', 'DINOSAUR', 'ANCIENT_DESERT']) assert.match(source, new RegExp(`themeRuntimeRegistry\\.register\\(THEME_IDS\\.${themeId},`));
  assert.doesNotMatch(source, /THEME_IDS\.MAGIC_CASTLE, \(\) => new PlaceholderThemeRuntime/);
  assert.equal(THEME_IDS.MAGIC_CASTLE, 'magic-castle');
});
