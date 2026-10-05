import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { QuestManager } from '../src/quests/QuestManager.js';
import { AdventureThemeCompletionManager } from '../src/adventure/AdventureThemeCompletionManager.js';
import { OCEAN_QUESTS, OCEAN_THEME } from '../src/themes/ocean/oceanConfig.js';
import { DINOSAUR_QUESTS } from '../src/themes/dinosaur/dinosaurQuestConfig.js';
import { ANCIENT_DESERT_QUESTS } from '../src/themes/ancient-desert/ancientDesertQuestConfig.js';
import { SPACE_QUESTS } from '../src/themes/space/spaceQuestConfig.js';
import { MAGIC_CASTLE_QUESTS } from '../src/themes/magic-castle/magicCastleQuestConfig.js';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { QuestUI } = await import('../src/quests/QuestUI.js');

class FakeElement {
  constructor() {
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.queries = new Map();
    this.hidden = false;
    this.textContent = '';
    this.parentNode = null;
  }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  querySelector(selector) {
    if (!this.queries.has(selector)) this.queries.set(selector, new FakeElement());
    return this.queries.get(selector);
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, fn) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(fn); this.listeners.set(type, listeners); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((node) => node !== this); }
  focus() {}
}

async function withFakeBrowser(run) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const fakeWindow = {
    addEventListener() {}, removeEventListener() {},
    setTimeout, clearTimeout,
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new FakeElement() } });
  try { return await run(); }
  finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else delete globalThis.document;
  }
}

function createProgressPanel(quests, worldName) {
  const questManager = new QuestManager(quests);
  const coordinator = { register: () => () => {}, toggle() {}, close() {} };
  const app = new FakeElement();
  const ui = new QuestUI({ app, questManager, panelCoordinator: coordinator, showCompletionToast: false, worldName, showProgressSummary: true });
  return { questManager, ui, app };
}

function summaryText(ui) { return ui.overview.textContent; }
function statusTexts(ui) { return ui.list.children.map((card) => card.children.at(-1).textContent); }

test('Ocean panel renders 0/3, 1/3, and 3/3 from live QuestManager state', () => withFakeBrowser(() => {
  const { questManager, ui } = createProgressPanel(OCEAN_QUESTS, '🌊 深海探險');
  assert.equal(ui.worldHeading.textContent, '🌊 深海探險');
  assert.equal(summaryText(ui), '任務進度 0/3');
  assert.deepEqual(statusTexts(ui), OCEAN_QUESTS.map(({ target }) => `⭕ 尚未完成 · 進度：0 / ${target}`));

  questManager.recordLandmarkExplored('reef');
  assert.equal(summaryText(ui), '任務進度 0/3', 'one discovery advances both landmark quests but completes neither');
  assert.match(statusTexts(ui)[0], /進度：1 \/ 3/);
  assert.match(statusTexts(ui)[2], /進度：1 \/ 2/);

  questManager.recordLandmarkExplored('ship');
  questManager.recordLandmarkExplored('cave');
  for (let index = 0; index < 5; index += 1) questManager.recordCollection(`item-${index}`, 'any');
  assert.equal(summaryText(ui), '任務進度 3/3');
  assert.deepEqual(statusTexts(ui), Array(3).fill('✅ 已完成'));
  ui.dispose();
}));

for (const [worldName, quests] of [
  ['🦕 恐龍世界', DINOSAUR_QUESTS],
  ['🏜️ 古文明沙漠', ANCIENT_DESERT_QUESTS],
  ['🚀 太空冒險', SPACE_QUESTS],
  ['🏰 魔法城堡', MAGIC_CASTLE_QUESTS],
]) {
  test(`${worldName} panel lists its configured quests and reflects completed state`, () => withFakeBrowser(() => {
    const { questManager, ui } = createProgressPanel(quests, worldName);
    assert.equal(ui.worldHeading.textContent, worldName);
    assert.equal(summaryText(ui), '任務進度 0/3');
    assert.deepEqual(ui.list.children.map((card) => card.children[0].textContent), quests.map(({ icon, title }) => `${icon} ${title}`));
    questManager.loadState({ progress: { [quests[0].id]: quests[0].target }, completed: [quests[0].id] });
    assert.equal(summaryText(ui), '任務進度 1/3');
    assert.deepEqual(statusTexts(ui), ['✅ 已完成', '⭕ 尚未完成 · 進度：0 / 5', '⭕ 尚未完成 · 進度：0 / 2']);
    ui.dispose();
  }));
}

test('rendering is read-only and keeps completion policy and routing registrations intact', async () => withFakeBrowser(async () => {
  const { questManager, ui } = createProgressPanel(MAGIC_CASTLE_QUESTS, '🏰 魔法城堡');
  questManager.recordLandmarkExplored('landmark');
  const before = JSON.stringify(questManager.saveState());
  const completionBefore = new AdventureThemeCompletionManager({ questSnapshot: questManager.getSnapshot() })
    .evaluateCompletion('magic-castle');
  ui.render(questManager.getSnapshot());
  assert.equal(JSON.stringify(questManager.saveState()), before);
  assert.deepEqual(
    new AdventureThemeCompletionManager({ questSnapshot: questManager.getSnapshot() }).evaluateCompletion('magic-castle'),
    completionBefore,
  );
  assert.equal(OCEAN_THEME.completionPolicy.type, 'required-quests');
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const runtime of ['OceanRuntime', 'DinosaurRuntime', 'AncientDesertRuntime', 'SpaceRuntime', 'MagicCastleRuntime']) {
    assert.match(source, new RegExp(`new ${runtime}\\(\\{[\\s\\S]*?questUIFactory: \\(options\\) => new QuestUI\\(options\\)`));
    assert.match(source, new RegExp(`new ${runtime}\\(\\{[\\s\\S]*?inventoryUIFactory: \\(options\\) => new InventoryUI\\(options\\)`));
  }
  ui.dispose();
}));

test('Island and Forest default QuestUI mode retains its existing display without a progress summary', () => withFakeBrowser(() => {
  const questManager = new QuestManager(OCEAN_QUESTS);
  const ui = new QuestUI({ app: new FakeElement(), questManager, panelCoordinator: { register: () => () => {}, toggle() {}, close() {} }, showCompletionToast: false });
  assert.equal(ui.overview.hidden, true);
  assert.equal(ui.worldHeading.hidden, true);
  assert.equal(statusTexts(ui)[0], '進度：0 / 3');
  ui.dispose();
}));
