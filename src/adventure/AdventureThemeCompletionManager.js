import {
  ADVENTURE_THEMES,
  THEME_COMPLETION_POLICY_TYPES,
  isCompletionPolicy,
} from './adventureConfig.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function incomplete(themeId, reason, extra = {}) {
  return { completed: false, themeId, reason, ...extra, completion: null };
}

/** Read-only evaluation of a theme's declared completion policy. */
export class AdventureThemeCompletionManager {
  constructor({
    themes = ADVENTURE_THEMES,
    themeProgress = {},
    questSnapshot = null,
    clock = () => new Date().toISOString(),
  } = {}) {
    this.themes = Array.isArray(themes) ? themes : [];
    this.themeProgress = isRecord(themeProgress) ? themeProgress : {};
    this.questSnapshot = questSnapshot;
    this.clock = typeof clock === 'function' ? clock : () => new Date().toISOString();
  }

  canComplete(themeId) {
    return this.evaluateCompletion(themeId).completed;
  }

  evaluateCompletion(themeId) {
    const theme = this.themes.find((entry) => entry?.id === themeId);
    if (!theme) return incomplete(themeId, 'theme-not-found');

    const policy = theme.completionPolicy;
    if (policy?.type === THEME_COMPLETION_POLICY_TYPES.DEFERRED) {
      return incomplete(themeId, 'completion-policy-deferred');
    }
    if (!isCompletionPolicy(policy)) {
      return incomplete(themeId, 'completion-policy-invalid');
    }
    if (policy.type !== THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS) {
      return incomplete(themeId, 'completion-policy-unsupported');
    }
    if (!Array.isArray(policy.questIds) || policy.questIds.length === 0) {
      return incomplete(themeId, 'completion-policy-invalid');
    }
    if (!Array.isArray(this.questSnapshot)) {
      return incomplete(themeId, 'quest-snapshot-unavailable');
    }

    const requiredQuests = policy.questIds.map((questId) => ({
      questId,
      matches: this.questSnapshot.filter((quest) => quest?.id === questId),
    }));
    const missingQuestIds = requiredQuests
      .filter(({ matches }) => matches.length !== 1)
      .map(({ questId }) => questId);
    if (missingQuestIds.length > 0) {
      return incomplete(themeId, 'required-quest-not-found', { missingQuestIds });
    }
    if (requiredQuests.some(({ matches }) => matches[0].completed !== true)) {
      return incomplete(themeId, 'required-quests-incomplete');
    }

    const savedCompletion = this.themeProgress[themeId]?.completion;
    const completion = isRecord(savedCompletion)
      && savedCompletion.completed === true
      && typeof savedCompletion.completedAt === 'string'
      && savedCompletion.completionPolicy === policy.type
      ? { ...savedCompletion }
      : {
        completed: true,
        completedAt: this.clock(),
        completionPolicy: policy.type,
      };

    return { completed: true, themeId, completion };
  }

  getCompletionResult(themeId) {
    return this.evaluateCompletion(themeId);
  }

  completeTheme(themeId) {
    return this.evaluateCompletion(themeId);
  }
}