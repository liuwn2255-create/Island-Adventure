import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { AudioManager } from '../src/audio/AudioManager.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.listeners = new Map();
    this.parentNode = null;
  }

  append(child) {
    child.remove();
    child.parentNode = this;
    this.children.push(child);
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    for (const child of children) this.append(child);
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes[name] = value; }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  click() { this.listeners.get('click')?.(); }
}

function withFakeBrowser(callback) {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const fakeDocument = {
    createElement: (tagName) => new FakeElement(tagName),
    body: new FakeElement('body'),
  };
  globalThis.document = fakeDocument;
  globalThis.window = { clearTimeout() {} };
  const app = new FakeElement('main');
  app.ownerDocument = fakeDocument;
  try {
    return callback({ app, document: fakeDocument });
  } finally {
    globalThis.document = oldDocument;
    globalThis.window = oldWindow;
  }
}

test('main creates one shared AudioManager instance', async () => {
  const source = await readFile(resolve('src/main.js'), 'utf8');
  assert.equal((source.match(/new AudioManager\s*\(/g) ?? []).length, 1);
  assert.doesNotMatch(await readFile(resolve('src/themes/forest/ForestRuntime.js'), 'utf8'), /new AudioManager\s*\(/);
  assert.doesNotMatch(await readFile(resolve('src/adventure/MysteryIslandRuntime.js'), 'utf8'), /new AudioManager\s*\(/);
});

test('mount creates one persistent global button across Island and Forest screen replacements', () => {
  withFakeBrowser(({ app, document }) => {
    const audioManager = new AudioManager({ app });
    audioManager.mount();
    audioManager.mount();

    assert.equal(document.body.children.length, 1);
    assert.equal(document.body.children[0], audioManager.button);

    app.replaceChildren(new FakeElement('island-screen'));
    assert.equal(document.body.children[0], audioManager.button);
    app.replaceChildren(new FakeElement('forest-screen'));
    assert.equal(document.body.children.length, 1);
    assert.equal(audioManager.button.parentNode, document.body);
  });
});

test('mute state and the same control persist across theme changes and can be toggled back on', () => {
  withFakeBrowser(({ app, document }) => {
    const audioManager = new AudioManager({ app });
    audioManager.mount();
    audioManager.startGameAudio();
    app.replaceChildren(new FakeElement('island-screen'));

    audioManager.button.click();
    assert.equal(audioManager.isMuted, true);
    assert.equal(audioManager.button.textContent, '🔇');

    app.replaceChildren(new FakeElement('forest-screen'));
    assert.equal(audioManager.isMuted, true);
    assert.equal(audioManager.button.getAttribute?.('aria-pressed') ?? audioManager.button.attributes['aria-pressed'], 'true');
    assert.equal(document.body.children[0], audioManager.button);

    app.replaceChildren(new FakeElement('island-screen'));
    audioManager.button.click();
    assert.equal(audioManager.isMuted, false);
    assert.equal(audioManager.button.textContent, '🔊');
    assert.equal(audioManager.musicRequested, true);
  });
});
