import { SAVE_DEBOUNCE_MS, SAVE_STORAGE_KEY, SAVE_VERSION } from './saveConfig.js';

/** Safe, versioned localStorage persistence for the current adventure. */
export class SaveManager {
  constructor({ storage, key = SAVE_STORAGE_KEY, debounceMs = SAVE_DEBOUNCE_MS, onSaved = () => {} } = {}) {
    if (storage === undefined) {
      try { storage = globalThis.localStorage; } catch { storage = null; }
    }
    this.storage = storage;
    this.key = key;
    this.debounceMs = debounceMs;
    this.onSaved = onSaved;
    this.timer = null;
    this.pendingData = null;
  }

  save(data) {
    if (!this.storage || !data || typeof data !== 'object') return false;
    try {
      this.storage.setItem(this.key, JSON.stringify({ ...data, version: SAVE_VERSION }));
      this.onSaved();
      return true;
    } catch (error) {
      console.warn('無法保存探險進度：', error);
      return false;
    }
  }

  scheduleSave(getData) {
    this.pendingData = getData;
    globalThis.clearTimeout(this.timer);
    this.timer = globalThis.setTimeout(() => {
      const data = typeof this.pendingData === 'function' ? this.pendingData() : this.pendingData;
      this.pendingData = null;
      this.timer = null;
      this.save(data);
    }, this.debounceMs);
  }

  flush() {
    globalThis.clearTimeout(this.timer);
    this.timer = null;
    if (!this.pendingData) return false;
    const data = typeof this.pendingData === 'function' ? this.pendingData() : this.pendingData;
    this.pendingData = null;
    return this.save(data);
  }

  load() {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!this.isValid(data)) { this.clearSave(); return null; }
      return data;
    } catch (error) {
      console.warn('探險存檔無法讀取，將重新開始：', error);
      this.clearSave();
      return null;
    }
  }

  hasSave() { return this.load() !== null; }
  getSaveData() { return this.load(); }

  clearSave() {
    if (!this.storage) return;
    globalThis.clearTimeout(this.timer);
    this.timer = null;
    this.pendingData = null;
    try { this.storage.removeItem(this.key); } catch (error) { console.warn('無法清除探險存檔：', error); }
  }

  isValid(data) {
    return Boolean(data && typeof data === 'object' && data.version === SAVE_VERSION
      && typeof data.characterId === 'string'
      && data.inventory && typeof data.inventory === 'object'
      && data.quests && typeof data.quests === 'object'
      && data.badges && typeof data.badges === 'object'
      && data.nature && typeof data.nature === 'object'
      && data.world && typeof data.world === 'object');
  }
}
