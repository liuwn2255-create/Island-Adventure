import assert from 'node:assert/strict';
import test from 'node:test';
import { ThemeRuntimeRegistry } from '../src/adventure/ThemeRuntimeRegistry.js';
import { PlaceholderThemeRuntime } from '../src/adventure/PlaceholderThemeRuntime.js';
import { MysteryIslandRuntime } from '../src/adventure/MysteryIslandRuntime.js';
import { ForestRuntime } from '../src/themes/forest/ForestRuntime.js';
import { THEME_IDS } from '../src/adventure/adventureConfig.js';

test('registry can be created', () => {
  assert.ok(new ThemeRuntimeRegistry() instanceof ThemeRuntimeRegistry);
});

test('registering a factory makes its theme available', () => {
  const registry = new ThemeRuntimeRegistry();
  registry.register('mystery-island', () => ({}));
  assert.equal(registry.has('mystery-island'), true);
});

test('has returns false for an unregistered theme', () => {
  const registry = new ThemeRuntimeRegistry();
  assert.equal(registry.has('forest'), false);
});

test('create calls the matching factory with the complete context and returns its runtime', () => {
  const registry = new ThemeRuntimeRegistry();
  const context = { character: { id: 'explorer' }, progress: { visited: true } };
  const runtime = { enter() {}, exit() {} };
  let receivedContext;
  registry.register('forest', (value) => { receivedContext = value; return runtime; });
  assert.equal(registry.create('forest', context), runtime);
  assert.equal(receivedContext, context);
});

test('create does not enter or exit the runtime', () => {
  const registry = new ThemeRuntimeRegistry();
  let entered = 0;
  let exited = 0;
  const runtime = { enter() { entered += 1; }, exit() { exited += 1; } };
  registry.register('ocean', () => runtime);
  assert.equal(registry.create('ocean', {}), runtime);
  assert.equal(entered, 0);
  assert.equal(exited, 0);
});

test('create throws an error containing an unregistered theme ID', () => {
  const registry = new ThemeRuntimeRegistry();
  assert.throws(() => registry.create('ancient-desert', {}), /ancient-desert/);
});

test('registering the same theme again replaces its factory', () => {
  const registry = new ThemeRuntimeRegistry();
  const oldRuntime = { name: 'old' };
  const newRuntime = { name: 'new' };
  registry.register('space', () => oldRuntime);
  registry.register('space', () => newRuntime);
  assert.equal(registry.create('space', {}), newRuntime);
});

test('register rejects an invalid theme ID', () => {
  const registry = new ThemeRuntimeRegistry();
  for (const themeId of ['', '   ', null, 1]) {
    assert.throws(() => registry.register(themeId, () => ({})), {
      name: 'TypeError', message: 'themeId must be a non-empty string',
    });
  }
});

test('register rejects a non-function factory', () => {
  const registry = new ThemeRuntimeRegistry();
  for (const factory of [null, {}, 'factory']) {
    assert.throws(() => registry.register('dinosaur', factory), {
      name: 'TypeError', message: 'factory must be a function',
    });
  }
});

test('Mystery Island and Forest route separately while five themes remain placeholders', () => {
  const registry = new ThemeRuntimeRegistry();
  const app = {};
  const placeholderFactory = () => new PlaceholderThemeRuntime({ app, createUI() {} });
  for (const themeId of [THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.MAGIC_CASTLE, THEME_IDS.SPACE, THEME_IDS.ANCIENT_DESERT]) {
    registry.register(themeId, placeholderFactory);
  }
  registry.register(THEME_IDS.FOREST, () => new ForestRuntime());
  registry.register(THEME_IDS.MYSTERY_ISLAND, () => new MysteryIslandRuntime({ startAdventure() {} }));
  assert.ok(registry.create(THEME_IDS.FOREST) instanceof ForestRuntime);
  assert.ok(registry.create(THEME_IDS.MYSTERY_ISLAND) instanceof MysteryIslandRuntime);
  for (const themeId of [THEME_IDS.OCEAN, THEME_IDS.DINOSAUR, THEME_IDS.MAGIC_CASTLE, THEME_IDS.SPACE, THEME_IDS.ANCIENT_DESERT]) {
    assert.ok(registry.create(themeId) instanceof PlaceholderThemeRuntime, themeId);
  }
});
