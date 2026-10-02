import { NATURE_ENTRIES } from './natureConfig.js';

/** Owns encyclopedia data and discovery state; it does not depend on game controls or UI. */
export class NatureGuideManager {
  constructor(entries = NATURE_ENTRIES) {
    this.entries = new Map(entries.map((entry) => [entry.id, { ...entry }]));
    this.discoveredIds = new Set(entries.filter((entry) => entry.discovered).map((entry) => entry.id));
    this.listeners = new Set();
  }

  getEntries() {
    return [...this.entries.values()].map((entry) => this.withDiscoveryState(entry));
  }

  getEntry(id) {
    const entry = this.entries.get(id);
    return entry ? this.withDiscoveryState(entry) : null;
  }

  isDiscovered(id) {
    return this.discoveredIds.has(id);
  }

  saveState() { return { discoveredIds: [...this.discoveredIds] }; }

  loadState(state) {
    const knownIds = new Set(this.entries.keys());
    this.discoveredIds = new Set((Array.isArray(state?.discoveredIds) ? state.discoveredIds : []).filter((id) => knownIds.has(id)));
    this.notify();
  }

  discover(id) {
    if (!this.entries.has(id) || this.discoveredIds.has(id)) return false;
    this.discoveredIds.add(id);
    this.notify();
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getEntries());
    return () => this.listeners.delete(listener);
  }

  withDiscoveryState(entry) {
    return { ...entry, discovered: this.discoveredIds.has(entry.id) };
  }

  notify() {
    const entries = this.getEntries();
    for (const listener of this.listeners) listener(entries);
  }
}
