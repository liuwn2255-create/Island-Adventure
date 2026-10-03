import { SAVE_DEBOUNCE_MS, SAVE_STORAGE_KEY, SAVE_VERSION } from './saveConfig.js';
import { isV2SaveData, LEGACY_SAVE_VERSION, migrateSaveData } from './saveMigration.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Versioned localStorage persistence with non-destructive legacy migration. */
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
    if (!this.storage || !isRecord(data)
      || (Object.hasOwn(data, 'version') && data.version !== SAVE_VERSION)) return false;

    const versionedData = { ...data, version: SAVE_VERSION };
    if (!this.isValidV2(versionedData)) return false;

    try {
      this.storage.setItem(this.key, JSON.stringify(versionedData));
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

  loadResult() {
    if (!this.storage) return { ok: false, status: 'storage-unavailable', data: null };

    let raw;
    try {
      raw = this.storage.getItem(this.key);
    } catch (error) {
      console.warn('探險存檔無法讀取：', error);
      return { ok: false, status: 'storage-read-failed', data: null };
    }
    if (raw === null) return { ok: false, status: 'missing', data: null };

    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.warn('探險存檔格式無法解析；原始資料已保留：', error);
      return { ok: false, status: 'invalid-json', data: null };
    }

    if (data?.version === LEGACY_SAVE_VERSION) {
      if (!this.isValidV1(data)) return { ok: false, status: 'invalid-v1', data: null };

      let migration;
      try {
        migration = this.migrateV1(data);
      } catch (error) {
        console.warn('探險存檔 migration 失敗；原始資料已保留：', error);
        return { ok: false, status: 'migration-failed', data: null };
      }
      if (!migration?.ok || !this.isValidV2(migration.data)) {
        console.warn('探險存檔 migration 或 v2 驗證失敗；原始資料已保留。');
        return { ok: false, status: 'migration-failed', data: null };
      }

      try {
        this.storage.setItem(this.key, JSON.stringify(migration.data));
      } catch (error) {
        console.warn('無法保存升級後的存檔；原始資料已保留：', error);
        return { ok: false, status: 'migration-write-failed', data: null };
      }
      return { ok: true, status: 'migrated', data: migration.data };
    }

    if (data?.version === SAVE_VERSION) {
      if (!this.isValidV2(data)) return { ok: false, status: 'invalid-v2', data: null };
      return { ok: true, status: 'loaded-v2', data };
    }
    return { ok: false, status: 'unsupported-version', data: null };
  }

  migrateV1(data) {
    return migrateSaveData(data);
  }

  load() {
    const result = this.loadResult();
    return result.ok ? result.data : null;
  }

  hasSave() {
    if (!this.storage) return false;
    try {
      return this.storage.getItem(this.key) !== null;
    } catch (error) {
      console.warn('無法確認探險存檔：', error);
      return false;
    }
  }

  getSaveData() { return this.load(); }

  clearSave() {
    if (!this.storage) return;
    globalThis.clearTimeout(this.timer);
    this.timer = null;
    this.pendingData = null;
    try { this.storage.removeItem(this.key); } catch (error) { console.warn('無法清除探險進度：', error); }
  }

  isValidV1(data) {
    return Boolean(isRecord(data)
      && data.version === LEGACY_SAVE_VERSION
      && typeof data.characterId === 'string'
      && data.characterId.trim().length > 0
      && isRecord(data.inventory)
      && isRecord(data.quests)
      && isRecord(data.badges)
      && isRecord(data.nature)
      && isRecord(data.world)
      && (!Object.hasOwn(data, 'natureQuests') || isRecord(data.natureQuests))
      && (!Object.hasOwn(data, 'hasSeenTutorial') || typeof data.hasSeenTutorial === 'boolean'));
  }

  isValidV2(data) {
    return isV2SaveData(data);
  }
}
