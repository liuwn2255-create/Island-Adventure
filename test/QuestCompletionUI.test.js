import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { registerHooks } from 'node:module';
import { QuestManager } from '../src/quests/QuestManager.js';
import { QUESTS } from '../src/quests/questConfig.js';
import { NatureQuestManager } from '../src/nature/quests/NatureQuestManager.js';
import { NATURE_QUESTS, NATURE_QUEST_SPECIES_IDS } from '../src/nature/quests/NatureQuestConfig.js';

// The UI imports CSS for Vite; Node unit tests replace CSS modules with empty modules.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { QuestCompletionUI } = await import('../src/ui/QuestCompletionUI.js');

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.className = '';
    this.textContent = '';
    this.parentNode = null;
    this.queries = new Map();
  }

  append(...elements) {
    for (const element of elements) {
      element.parentNode?.removeChild?.(element);
      element.parentNode = this;
      this.children.push(element);
    }
  }

  appendChild(element) { this.append(element); return element; }
  removeChild(element) {
    this.children = this.children.filter((child) => child !== element);
    element.parentNode = null;
    return element;
  }
  remove() { this.parentNode?.removeChild?.(this); }
  replaceChildren(...elements) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...elements);
  }
  querySelector(selector) {
    if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement());
    return this.queries.get(selector);
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  focus() { this.focused = true; }
  click() { for (const listener of this.listeners.get('click') ?? []) listener({ target: this }); }
}

class CompletionSource {
  listeners = new Set();
  subscribeCompleted(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(quest) { for (const listener of this.listeners) listener(quest); }
}

class FakePanelCoordinator {
  activePanelId = null;
  panels = new Map();
  register(id, onChange) {
    this.panels.set(id, onChange);
    return () => this.panels.delete(id);
  }
  open(id) {
    if (this.activePanelId) return false;
    this.activePanelId = id;
    this.panels.get(id)?.(true);
    return true;
  }
  close(id) {
    if (this.activePanelId !== id) return false;
    this.activePanelId = null;
    this.panels.get(id)?.(false);
    return true;
  }
}

const completedEvent = (title) => ({ title, description: `${title} description` });
const tickMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

afterEach(() => {
  delete globalThis.document;
});

function createUI({ questManager = new CompletionSource(), natureQuestManager = new CompletionSource(), getBadgeForCompletion } = {}) {
  globalThis.document = { createElement: (tagName) => new FakeElement(tagName) };
  const app = new FakeElement('main');
  const panelCoordinator = new FakePanelCoordinator();
  const interactionManager = { activeLandmark: null };
  const ui = new QuestCompletionUI({
    app,
    panelCoordinator,
    interactionManager,
    questManager,
    natureQuestManager,
    getBadgeForCompletion,
  });
  return { app, panelCoordinator, ui, questManager, natureQuestManager };
}

test('general quest completion opens the shared completion card', async () => {
  const fixture = createUI();
  fixture.questManager.emit(completedEvent('水晶探索者'));
  await tickMicrotasks();

  assert.equal(fixture.ui.isOpen, true);
  assert.equal(fixture.panelCoordinator.activePanelId, 'quest-completion');
  assert.equal(fixture.ui.backdrop.dataset.kind, 'general');
  assert.equal(fixture.ui.title.textContent, '水晶探索者');
  assert.equal(fixture.ui.description.textContent, '水晶探索者 description！');
  fixture.ui.dispose();
});

test('nature quest completion opens the shared completion card', async () => {
  const fixture = createUI();
  fixture.natureQuestManager.emit(completedEvent('自然觀察家'));
  await tickMicrotasks();

  assert.equal(fixture.ui.isOpen, true);
  assert.equal(fixture.ui.backdrop.dataset.kind, 'nature');
  assert.equal(fixture.ui.eyebrow.textContent, '🌿 自然任務完成！');
  assert.equal(fixture.ui.title.textContent, '自然觀察家');
  fixture.ui.dispose();
});

test('eligible badge feedback is included in the completion card', async () => {
  const badge = { icon: '🏅', title: '水晶收藏家' };
  const fixture = createUI({ getBadgeForCompletion: () => badge });
  fixture.questManager.emit(completedEvent('水晶探索者'));
  await tickMicrotasks();

  assert.equal(fixture.ui.badge.hidden, false);
  assert.equal(fixture.ui.badge.children.length, 2);
  assert.equal(fixture.ui.badge.children[0].textContent, '🏅 新徽章！');
  assert.equal(fixture.ui.badge.children[1].textContent, '🏅 水晶收藏家');
  fixture.ui.dispose();
});

test('multiple completion events queue once and show one card at a time', async () => {
  const fixture = createUI();
  fixture.questManager.emit(completedEvent('水晶探索者'));
  fixture.questManager.emit(completedEvent('收藏小達人'));
  await tickMicrotasks();

  assert.equal(fixture.app.children.length, 1);
  assert.equal(fixture.ui.queue.length, 2);
  assert.equal(fixture.ui.title.textContent, '水晶探索者');
  fixture.ui.continueButton.click();
  assert.equal(fixture.ui.isOpen, true);
  assert.equal(fixture.ui.queue.length, 1);
  assert.equal(fixture.ui.title.textContent, '收藏小達人');
  assert.equal(fixture.app.children.length, 1);
  fixture.ui.dispose();
});

test('restoring completed general and nature quest state does not replay completion cards', async () => {
  const questManager = new QuestManager();
  questManager.loadState({
    progress: Object.fromEntries(QUESTS.map(({ id, target }) => [id, target])),
    completed: QUESTS.map(({ id }) => id),
  });
  const natureQuestManager = new NatureQuestManager();
  natureQuestManager.loadState({
    discoveredIds: [...NATURE_QUEST_SPECIES_IDS],
    observationCount: Math.max(...NATURE_QUESTS.filter(({ progressType }) => progressType === 'observations').map(({ target }) => target)),
    correctAnswerCount: Math.max(...NATURE_QUESTS.filter(({ progressType }) => progressType === 'correctAnswers').map(({ target }) => target)),
    completedIds: NATURE_QUESTS.map(({ id }) => id),
  });

  const fixture = createUI({ questManager, natureQuestManager });
  await tickMicrotasks();
  assert.equal(fixture.ui.queue.length, 0);
  assert.equal(fixture.ui.isOpen, false);
  assert.equal(fixture.panelCoordinator.activePanelId, null);
  fixture.ui.dispose();
});
