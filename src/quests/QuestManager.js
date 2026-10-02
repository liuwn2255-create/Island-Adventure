import { QUESTS } from './questConfig.js';

/** Tracks quest progress from unique world-item and landmark events. */
export class QuestManager {
  constructor(quests = QUESTS) {
    this.quests = quests;
    this.progress = new Map(quests.map((quest) => [quest.id, 0]));
    this.completed = new Set();
    this.collectedItemIds = new Set();
    this.exploredLandmarkIds = new Set();
    this.listeners = new Set();
    this.completionListeners = new Set();
  }

  getSnapshot() {
    return this.quests.map((quest) => ({
      ...quest,
      progress: this.progress.get(quest.id) ?? 0,
      completed: this.completed.has(quest.id),
    }));
  }

  hasCollectedItem(itemId) {
    return this.collectedItemIds.has(itemId);
  }

  hasExploredLandmark(landmarkId) {
    return this.exploredLandmarkIds.has(landmarkId);
  }

  saveState() {
    return { progress: Object.fromEntries(this.progress), completed: [...this.completed], collectedItemIds: [...this.collectedItemIds], exploredLandmarkIds: [...this.exploredLandmarkIds] };
  }

  loadState(state) {
    const knownIds = new Set(this.quests.map((quest) => quest.id));
    for (const quest of this.quests) {
      const value = Number(state?.progress?.[quest.id]);
      this.progress.set(quest.id, Number.isFinite(value) ? Math.max(0, Math.min(quest.target, Math.floor(value))) : 0);
    }
    this.completed = new Set((Array.isArray(state?.completed) ? state.completed : []).filter((id) => knownIds.has(id)));
    for (const quest of this.quests) {
      if (this.completed.has(quest.id) || this.progress.get(quest.id) >= quest.target) {
        this.completed.add(quest.id);
        this.progress.set(quest.id, quest.target);
      }
    }
    this.collectedItemIds = new Set(Array.isArray(state?.collectedItemIds) ? state.collectedItemIds.filter((id) => typeof id === 'string') : []);
    this.exploredLandmarkIds = new Set(Array.isArray(state?.exploredLandmarkIds) ? state.exploredLandmarkIds.filter((id) => typeof id === 'string') : []);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  subscribeCompleted(listener) {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  recordCollection(itemId, itemType) {
    if (!itemId || this.collectedItemIds.has(itemId)) return false;
    this.collectedItemIds.add(itemId);

    let changed = false;
    for (const quest of this.quests) {
      const matches = quest.type === 'collect_any'
        || (quest.type === 'collect_item' && quest.itemType === itemType);
      if (matches) changed = this.advance(quest) || changed;
    }
    if (changed) this.notify();
    return changed;
  }

  recordLandmarkExplored(landmarkId) {
    if (!landmarkId || this.exploredLandmarkIds.has(landmarkId)) return false;
    this.exploredLandmarkIds.add(landmarkId);

    let changed = false;
    for (const quest of this.quests) {
      if (quest.type === 'explore_landmark') changed = this.advance(quest) || changed;
    }
    if (changed) this.notify();
    return changed;
  }

  advance(quest) {
    if (this.completed.has(quest.id)) return false;
    const nextProgress = Math.min(quest.target, (this.progress.get(quest.id) ?? 0) + 1);
    this.progress.set(quest.id, nextProgress);
    if (nextProgress >= quest.target) {
      this.completed.add(quest.id);
      const completedQuest = { ...quest };
      for (const listener of this.completionListeners) listener(completedQuest);
    }
    return true;
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
