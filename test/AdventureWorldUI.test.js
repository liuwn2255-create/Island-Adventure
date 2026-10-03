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

test('AdventureWorldUI renders every configured theme and only enables playable themes', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const ui = new AdventureWorldUI({ app, themeManager: new AdventureThemeManager({ themes: ADVENTURE_THEMES }) });
    const cards = getCards(ui);
    assert.equal(cards.length, ADVENTURE_THEMES.length);
    assert.deepEqual(ui.buttons.map(({ button }) => button.disabled), [false, true, true, true]);
    assert.deepEqual(ui.buttons.map(({ button }) => button.textContent), [
      '開始冒險', '尚未開放', '尚未開放', '尚未開放',
    ]);
    ui.destroy();
  });
});

test('AdventureWorldUI marks a saved playable theme as continue and dispatches its selection', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const selected = [];
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({
        themes: ADVENTURE_THEMES,
        themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: { status: 'in-progress' } },
      }),
      onSelect: (theme) => selected.push(theme.id),
    });
    assert.equal(ui.buttons[0].button.textContent, '繼續探險');
    ui.buttons[0].button.click();
    ui.buttons[1].button.click();
    assert.deepEqual(selected, [THEME_IDS.MYSTERY_ISLAND]);
    ui.destroy();
  });
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
