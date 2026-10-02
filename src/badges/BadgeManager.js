import { BADGES } from './badgeConfig.js';

/** Owns unlocked badge state and listens for first-time quest completions. */
export class BadgeManager {
  constructor({ questManager, natureQuestManager = null, badges = BADGES }) {
    this.badges = badges;
    this.natureQuestManager = natureQuestManager;
    this.unlockedIds = new Set();
    this.listeners = new Set();
    this.unsubscribeQuest = questManager.subscribeCompleted((quest) => {
      const badge = this.badges.find((candidate) => candidate.questId === quest.id);
      if (badge) this.unlockBadge(badge.id);
    });
    this.unsubscribeNatureQuest = natureQuestManager?.subscribeCompleted(() => this.syncNatureQuestCompletion()) ?? (() => {});
  }

  getBadges() {
    return this.badges.filter((badge) => this.unlockedIds.has(badge.id)).map((badge) => ({ ...badge }));
  }

  saveState() { return { unlockedIds: [...this.unlockedIds] }; }

  loadState(state) {
    const knownIds = new Set(this.badges.map((badge) => badge.id));
    this.unlockedIds = new Set((Array.isArray(state?.unlockedIds) ? state.unlockedIds : []).filter((id) => knownIds.has(id)));
    for (const listener of this.listeners) listener(this.getBadges());
  }

  hasBadge(id) {
    return this.unlockedIds.has(id);
  }

  unlockBadge(id) {
    if (!this.badges.some((badge) => badge.id === id) || this.unlockedIds.has(id)) return false;
    this.unlockedIds.add(id);
    const unlocked = this.getBadges();
    for (const listener of this.listeners) listener(unlocked);
    return true;
  }

  syncNatureQuestCompletion() {
    if (this.natureQuestManager?.areAllCompleted()) return this.unlockBadge('nature-explorer');
    return false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getBadges());
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.unsubscribeQuest();
    this.unsubscribeNatureQuest();
    this.listeners.clear();
  }
}
