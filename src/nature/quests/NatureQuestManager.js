import { NATURE_QUESTS, NATURE_QUEST_SPECIES_IDS } from './NatureQuestConfig.js';

/** Tracks natural discovery, observation, and learning events independently of the general quest system. */
export class NatureQuestManager {
  constructor({ quests = NATURE_QUESTS, speciesIds = NATURE_QUEST_SPECIES_IDS } = {}) {
    this.quests = quests;
    this.speciesIds = new Set(speciesIds);
    this.discoveredIds = new Set();
    this.observationCount = 0;
    this.correctAnswerCount = 0;
    this.completedIds = new Set();
    this.listeners = new Set();
    this.completionListeners = new Set();
  }

  getQuests() {
    return this.quests.map((quest) => ({
      ...quest,
      progress: this.getProgress(quest.id),
      completed: this.isCompleted(quest.id),
    }));
  }

  getQuest(id) { return this.getQuests().find((quest) => quest.id === id) ?? null; }
  getProgress(id) {
    const quest = this.quests.find((entry) => entry.id === id);
    if (!quest) return 0;
    if (quest.progressType === 'discoveries') return Math.min(quest.target, this.discoveredIds.size);
    if (quest.progressType === 'observations') return Math.min(quest.target, this.observationCount);
    if (quest.progressType === 'correctAnswers') return Math.min(quest.target, this.correctAnswerCount);
    return 0;
  }
  isCompleted(id) { return this.completedIds.has(id); }
  areAllCompleted() { return this.quests.length > 0 && this.quests.every((quest) => this.completedIds.has(quest.id)); }

  recordDiscovery(id) {
    if (!this.speciesIds.has(id) || this.discoveredIds.has(id)) return false;
    this.discoveredIds.add(id);
    this.updateCompletions();
    this.notify();
    return true;
  }

  /** Imports already-known guide discoveries without replaying old completion toasts. */
  syncDiscoveries(ids) {
    let changed = false;
    for (const id of ids) {
      if (this.speciesIds.has(id) && !this.discoveredIds.has(id)) {
        this.discoveredIds.add(id);
        changed = true;
      }
    }
    if (changed) {
      this.updateCompletions({ notifyCompletion: false });
      this.notify();
    }
  }

  recordObservation() {
    this.observationCount += 1;
    this.updateCompletions();
    this.notify();
    return this.observationCount;
  }

  recordCorrectAnswer() {
    this.correctAnswerCount += 1;
    this.updateCompletions();
    this.notify();
    return this.correctAnswerCount;
  }

  saveState() {
    return {
      discoveredIds: [...this.discoveredIds],
      observationCount: this.observationCount,
      correctAnswerCount: this.correctAnswerCount,
      completedIds: [...this.completedIds],
    };
  }

  loadState(state) {
    const knownQuestIds = new Set(this.quests.map((quest) => quest.id));
    this.discoveredIds = new Set((Array.isArray(state?.discoveredIds) ? state.discoveredIds : []).filter((id) => this.speciesIds.has(id)));
    this.observationCount = this.readCount(state?.observationCount);
    this.correctAnswerCount = this.readCount(state?.correctAnswerCount);
    this.completedIds = new Set((Array.isArray(state?.completedIds) ? state.completedIds : []).filter((id) => knownQuestIds.has(id)));
    for (const quest of this.quests) {
      if (this.getProgress(quest.id) >= quest.target) this.completedIds.add(quest.id);
      if (this.completedIds.has(quest.id)) {
        if (quest.progressType === 'observations') this.observationCount = Math.max(this.observationCount, quest.target);
        if (quest.progressType === 'correctAnswers') this.correctAnswerCount = Math.max(this.correctAnswerCount, quest.target);
      }
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getQuests());
    return () => this.listeners.delete(listener);
  }

  subscribeCompleted(listener) {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  updateCompletions({ notifyCompletion = true } = {}) {
    for (const quest of this.quests) {
      if (this.getProgress(quest.id) < quest.target || this.completedIds.has(quest.id)) continue;
      this.completedIds.add(quest.id);
      if (notifyCompletion) {
        const completedQuest = this.getQuest(quest.id);
        for (const listener of this.completionListeners) listener(completedQuest);
      }
    }
  }

  notify() {
    const snapshot = this.getQuests();
    for (const listener of this.listeners) listener(snapshot);
  }

  readCount(value) { return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0; }
}
