import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureWorldUI } from '../src/adventure/AdventureWorldUI.js';
import { AdventureThemeManager } from '../src/adventure/AdventureThemeManager.js';
import { ADVENTURE_THEMES, THEME_IDS } from '../src/adventure/adventureConfig.js';

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.disabled = false;
    this.parentNode = null;
    this.textContent = '';
  }

  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  replaceChildren(...nodes) {
    this.children.forEach((child) => { child.parentNode = null; });
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
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  click() {
    if (this.disabled) return;
    for (const listener of this.listeners.get('click') ?? []) listener();
  }
}

function withDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: (tagName) => new TestElement(tagName) };
  try { callback(); } finally { globalThis.document = previousDocument; }
}

function getCards(ui) {
  return ui.root.children[0].children[1].children;
}

test('AdventureWorldUI renders seven selectable theme cards with start labels', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const ui = new AdventureWorldUI({ app, themeManager: new AdventureThemeManager({ themes: ADVENTURE_THEMES }) });
    const cards = getCards(ui);
    assert.equal(cards.length, ADVENTURE_THEMES.length);
    assert.equal(cards.length, 7);
    assert.deepEqual(ui.buttons.map(({ button }) => button.disabled), Array(7).fill(false));
    assert.deepEqual(ui.buttons.map(({ button }) => button.textContent), Array(7).fill('開始冒險'));
    ui.destroy();
  });
});

test('AdventureWorldUI marks saved Theme progress as continue and dispatches all seven selections', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const selected = [];
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({
        themes: ADVENTURE_THEMES,
        themeProgress: { [THEME_IDS.SPACE]: { status: 'in-progress' } },
      }),
      onSelect: (theme) => selected.push(theme.id),
    });
    assert.equal(ui.buttons[5].button.textContent, '繼續探險');
    assert.deepEqual(ui.buttons.map(({ button }) => button.textContent), [
      '開始冒險', '開始冒險', '開始冒險', '開始冒險', '開始冒險', '繼續探險', '開始冒險',
    ]);
    for (const { button } of ui.buttons) {
      assert.equal(button.disabled, false);
      button.click();
    }
    assert.deepEqual(selected, Object.values(THEME_IDS));
    ui.destroy();
  });
});

test('AdventureWorldUI keeps all themes clickable when Mystery Island is completed', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const selected = [];
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({
        themes: ADVENTURE_THEMES,
        themeProgress: {
          [THEME_IDS.MYSTERY_ISLAND]: {
            status: 'completed',
            completion: { completed: true },
          },
        },
      }),
      onSelect: (theme) => selected.push(theme.id),
    });

    for (const { button } of ui.buttons) {
      assert.equal(button.disabled, false);
      button.click();
    }
    assert.deepEqual(selected, Object.values(THEME_IDS));
    ui.destroy();
  });
});

test('Adventure World CSS keeps the theme grid responsive at phone widths', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/adventure/adventureWorld.css', import.meta.url), 'utf8');
  assert.match(css, /\.adventure-world-content\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /@media\s*\(max-width:\s*560px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(css, /(?:min-width|width):\s*4(?:20|30|40|43)px/);
});

test('AdventureWorldUI destroy removes the screen and its selection handlers', () => {
  withDocument(() => {
    const app = new TestElement('div');
    let selectedCount = 0;
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({ themes: ADVENTURE_THEMES }),
      onSelect: () => { selectedCount += 1; },
    });
    const button = ui.buttons[0].button;
    ui.destroy();
    button.click();
    assert.equal(app.children.length, 0);
    assert.equal(selectedCount, 0);
  });
});
