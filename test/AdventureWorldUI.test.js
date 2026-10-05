import assert from 'node:assert/strict';
import test from 'node:test';
import { AdventureWorldUI } from '../src/adventure/AdventureWorldUI.js';
import { AdventureThemeManager } from '../src/adventure/AdventureThemeManager.js';
import { ADVENTURE_THEMES, THEME_IDS, THEME_STATUSES } from '../src/adventure/adventureConfig.js';

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

test('AdventureWorldUI shows one compact scroll hint beside the subtitle', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const ui = new AdventureWorldUI({ app, themeManager: new AdventureThemeManager({ themes: ADVENTURE_THEMES }) });
    const subtitle = ui.root.children[0].children[0].children[1];
    const hints = subtitle.children.filter((child) => child.className === 'adventure-world-scroll-hint');
    assert.equal(hints.length, 1);
    assert.equal(hints[0].textContent, '↓ 向下探索更多世界');
    ui.destroy();
  });
});

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

test('seven world cards show completion, quest, collectible, and badge summaries', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({
        themeProgress: {
          [THEME_IDS.MAGIC_CASTLE]: {
            status: THEME_STATUSES.IN_PROGRESS,
            quests: { completed: ['magic-castle-explorer'], collectedItemIds: ['castle-item-1'] },
            collections: { collectedItemIds: ['castle-item-1', 'castle-item-2'] },
            badges: { unlockedIds: [] },
          },
          [THEME_IDS.SPACE]: {
            status: THEME_STATUSES.COMPLETED,
            completion: { completed: true },
            quests: { completed: ['space-explorer', 'space-collector', 'space-discoverer'] },
            collections: { collectedItemIds: ['a', 'b', 'c', 'd', 'e'] },
            badges: { unlockedIds: ['space-explorer'] },
          },
        },
      }),
    });
    const cards = getCards(ui);
    assert.equal(cards.length, 7);
    assert.deepEqual(cards[0].children[2].children.map(({ textContent }) => textContent), [
      '⭕ 尚未完成', '任務 0/3', '收藏 0/12', '🏅 尚未取得',
    ]);
    const castle = cards[4];
    assert.deepEqual(castle.children[2].children.map(({ textContent }) => textContent), [
      '⭕ 尚未完成', '任務 1/3', '收藏 2/5', '🏅 尚未取得',
    ]);
    assert.equal(ui.buttons[4].button.textContent, '繼續探險');
    const space = cards[5];
    assert.deepEqual(space.children[2].children.map(({ textContent }) => textContent), [
      '✅ 已完成', '任務 3/3', '收藏 5/5', '🏅 已取得徽章',
    ]);
    assert.equal(space.className.includes('is-completed'), true);
    assert.equal(ui.buttons[5].button.textContent, '已完成');
    ui.destroy();
  });
});

test('Magic Castle summary safely displays zero progress when its Save v2 bucket is absent or incomplete', () => {
  withDocument(() => {
    const app = new TestElement('div');
    const ui = new AdventureWorldUI({
      app,
      themeManager: new AdventureThemeManager({
        themeProgress: {
          [THEME_IDS.MAGIC_CASTLE]: {
            quests: null,
            collections: null,
            badges: null,
          },
        },
      }),
    });
    assert.deepEqual(getCards(ui)[4].children[2].children.map(({ textContent }) => textContent), [
      '⭕ 尚未完成', '任務 0/3', '收藏 0/5', '🏅 尚未取得',
    ]);
    assert.equal(ui.buttons[4].button.textContent, '開始冒險');
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
