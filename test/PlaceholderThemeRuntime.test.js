import assert from 'node:assert/strict';
import test from 'node:test';
import { PlaceholderThemeRuntime } from '../src/adventure/PlaceholderThemeRuntime.js';

class FakePlaceholderUI {
  constructor({ app, theme, onBack }) {
    this.app = app;
    this.theme = theme;
    this.onBack = onBack;
    this.root = { remove: () => { app.visible = null; } };
    app.visible = this.root;
  }
  destroy() { this.root.remove(); }
}

const forest = {
  id: 'forest',
  name: '🌲 神秘森林',
  description: '森林探險即將展開。',
};
const createRuntime = (app = {}) => new PlaceholderThemeRuntime({
  app,
  createUI: (options) => new FakePlaceholderUI(options),
});

test('PlaceholderThemeRuntime can be created', () => {
  assert.ok(createRuntime() instanceof PlaceholderThemeRuntime);
});

test('enter creates and displays its placeholder UI', () => {
  const app = {};
  const runtime = createRuntime(app);
  const ui = runtime.enter({ theme: forest });

  assert.equal(ui, runtime.placeholderUI);
  assert.equal(app.visible, ui.root);
});

test('enter passes the selected Theme metadata to the UI factory', () => {
  const app = {};
  let options;
  const runtime = new PlaceholderThemeRuntime({
    app,
    createUI: (value) => {
      options = value;
      return new FakePlaceholderUI(value);
    },
  });
  const onBack = () => {};

  runtime.enter({ theme: forest, onBack });

  assert.equal(options.app, app);
  assert.equal(options.theme, forest);
  assert.equal(options.theme.name, '🌲 神秘森林');
  assert.equal(options.theme.description, '森林探險即將展開。');
  assert.equal(options.onBack, onBack);
});

test('exit closes the placeholder UI', () => {
  const app = {};
  const runtime = createRuntime(app);
  runtime.enter({ theme: forest });
  runtime.exit();

  assert.equal(app.visible, null);
  assert.equal(runtime.placeholderUI, null);
});

test('repeated exit is safe', () => {
  const runtime = createRuntime();
  runtime.enter({ theme: forest });
  assert.doesNotThrow(() => runtime.exit());
  assert.doesNotThrow(() => runtime.exit());
});

test('Placeholder Runtime creates no gameplay or save resources', () => {
  const runtime = createRuntime();
  runtime.enter({ theme: forest });

  assert.deepEqual(Object.keys(runtime).sort(), ['app', 'createUI', 'placeholderUI']);
  for (const resource of ['scene', 'player', 'renderer', 'questManager', 'natureManager', 'npcManager', 'saveManager']) {
    assert.equal(Object.hasOwn(runtime, resource), false, resource);
  }
});
