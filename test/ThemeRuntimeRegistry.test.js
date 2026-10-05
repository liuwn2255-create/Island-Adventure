import assert from 'node:assert/strict';
import test from 'node:test';
import { ThemeRuntimeRegistry } from '../src/adventure/ThemeRuntimeRegistry.js';
import { MysteryIslandRuntime } from '../src/adventure/MysteryIslandRuntime.js';
import { ForestRuntime } from '../src/themes/forest/ForestRuntime.js';
import { OceanRuntime } from '../src/themes/ocean/OceanRuntime.js';
import { DinosaurRuntime } from '../src/themes/dinosaur/DinosaurRuntime.js';
import { AncientDesertRuntime } from '../src/themes/ancient-desert/AncientDesertRuntime.js';
import { SpaceRuntime } from '../src/themes/space/SpaceRuntime.js';
import { MagicCastleRuntime } from '../src/themes/magic-castle/MagicCastleRuntime.js';
import { THEME_IDS } from '../src/adventure/adventureConfig.js';
import { readFile } from 'node:fs/promises';

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

test('all seven worlds route to their dedicated playable runtimes', () => {
  const registry = new ThemeRuntimeRegistry();
  registry.register(THEME_IDS.OCEAN, () => new OceanRuntime());
  registry.register(THEME_IDS.DINOSAUR, () => new DinosaurRuntime());
  registry.register(THEME_IDS.ANCIENT_DESERT, () => new AncientDesertRuntime());
  registry.register(THEME_IDS.SPACE, () => new SpaceRuntime());
  registry.register(THEME_IDS.MAGIC_CASTLE, () => new MagicCastleRuntime());
  registry.register(THEME_IDS.FOREST, () => new ForestRuntime());
  registry.register(THEME_IDS.MYSTERY_ISLAND, () => new MysteryIslandRuntime({ startAdventure() {} }));
  assert.ok(registry.create(THEME_IDS.FOREST) instanceof ForestRuntime);
  assert.ok(registry.create(THEME_IDS.MYSTERY_ISLAND) instanceof MysteryIslandRuntime);
  assert.ok(registry.create(THEME_IDS.OCEAN) instanceof OceanRuntime);
  assert.ok(registry.create(THEME_IDS.DINOSAUR) instanceof DinosaurRuntime);
  assert.ok(registry.create(THEME_IDS.ANCIENT_DESERT) instanceof AncientDesertRuntime);
  assert.ok(registry.create(THEME_IDS.SPACE) instanceof SpaceRuntime);
  assert.ok(registry.create(THEME_IDS.MAGIC_CASTLE) instanceof MagicCastleRuntime);
});

test('main routes Ancient Desert to its Runtime without changing Save or completion routing', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ AncientDesertRuntime \} from '\.\/themes\/ancient-desert\/AncientDesertRuntime\.js';/);
  assert.match(source, /themeRuntimeRegistry\.register\(THEME_IDS\.ANCIENT_DESERT, \(\) => new AncientDesertRuntime\(/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.ANCIENT_DESERT\)[\s\S]*?activeThemeRuntime\.enter\(/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.ANCIENT_DESERT\)[\s\S]*?restoreData: latestData,[\s\S]*?saveManager,/);
  assert.match(source, /if \(theme\.id === THEME_IDS\.ANCIENT_DESERT\)[\s\S]*?showAdventureWorld\(character\);/);
  assert.match(source, /id !== THEME_IDS\.ANCIENT_DESERT/);
});
