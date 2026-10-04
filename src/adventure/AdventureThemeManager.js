import {
  ADVENTURE_THEMES,
  THEME_PROGRESS_FIELDS,
  THEME_STATUSES,
  canEnterTheme,
  isThemeStatus,
} from './adventureConfig.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasSavedProgress(progress, status) {
  if (status === THEME_STATUSES.IN_PROGRESS || status === THEME_STATUSES.COMPLETED) return true;
  if (!progress) return false;
  if (progress.hasSeenTutorial === true) return true;

  return THEME_PROGRESS_FIELDS.some((field) => {
    if (field === 'hasSeenTutorial') return false;
    const value = progress[field];
    return isRecord(value) && Object.keys(value).length > 0;
  });
}

/** Read-only theme catalog and per-save entry state for Adventure World. */
export class AdventureThemeManager {
  constructor({ themes = ADVENTURE_THEMES, themeProgress = {} } = {}) {
    this.themes = Array.isArray(themes) ? themes : [];
    this.themeProgress = isRecord(themeProgress) ? themeProgress : {};
  }

  getThemes() {
    return this.themes.map((theme) => this.getThemeState(theme?.id)).filter(Boolean);
  }

  getThemeState(themeId) {
    const theme = this.themes.find((entry) => entry?.id === themeId);
    if (!theme) return null;

    const storedProgress = this.themeProgress[themeId];
    const progress = isRecord(storedProgress) ? storedProgress : null;
    const savedStatus = isThemeStatus(progress?.status) ? progress.status : null;
    const savedCompletion = progress?.completion;
    const completed = savedStatus === THEME_STATUSES.COMPLETED
      || savedCompletion?.completed === true;
    const status = completed
      ? THEME_STATUSES.COMPLETED
      : savedStatus === THEME_STATUSES.IN_PROGRESS
        ? THEME_STATUSES.IN_PROGRESS
        : THEME_STATUSES.AVAILABLE;
    const playable = theme.playable === true;
    const canEnter = playable && canEnterTheme(theme);
    const hasProgress = hasSavedProgress(progress, savedStatus);

    return {
      theme,
      progress,
      status,
      playable,
      hasProgress,
      canEnter,
      actionLabel: completed ? '已完成' : hasProgress ? '繼續探險' : '開始冒險',
    };
  }

  isThemeCompleted(themeId) {
    const progress = this.themeProgress[themeId];
    return progress?.status === THEME_STATUSES.COMPLETED
      || progress?.completion?.completed === true;
  }

  canEnter(themeId) {
    return this.getThemeState(themeId)?.canEnter ?? false;
  }

  hasProgress(themeId) {
    return this.getThemeState(themeId)?.hasProgress ?? false;
  }

  getActionLabel(themeId) {
    return this.getThemeState(themeId)?.actionLabel ?? '開始冒險';
  }

  selectTheme(themeId) {
    const state = this.getThemeState(themeId);
    return state?.canEnter ? state.theme : null;
  }
}
