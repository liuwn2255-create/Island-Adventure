import { ITEM_TYPES } from './itemConfig.js';

export class InventoryManager {
  constructor(types = ITEM_TYPES) {
    this.types = types;
    this.counts = new Map(types.map((type) => [type.id, 0]));
    this.listeners = new Set();
  }

  add(typeId) {
    if (!this.counts.has(typeId)) throw new Error(`未知的背包物品種類：${typeId}`);
    const count = this.counts.get(typeId) + 1;
    this.counts.set(typeId, count);
    for (const listener of this.listeners) listener(this.getCounts());
    return count;
  }

  getCount(typeId) {
    return this.counts.get(typeId) ?? 0;
  }

  getCounts() {
    return Object.fromEntries(this.counts);
  }

  saveState() { return { counts: this.getCounts() }; }

  loadState(state) {
    const saved = state?.counts;
    for (const [id] of this.counts) {
      const count = Number(saved?.[id]);
      this.counts.set(id, Number.isInteger(count) && count >= 0 ? count : 0);
    }
    for (const listener of this.listeners) listener(this.getCounts());
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getCounts());
    return () => this.listeners.delete(listener);
  }
}
