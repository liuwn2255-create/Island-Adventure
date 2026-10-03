import {
  ADVENTURE_THEMES,
  THEME_STATUSES,
  canEnterTheme,
  isThemeStatus,
} from './adventureConfig.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    const status = theme.status;
    const playable = theme.playable === true;
    const locked = !canEnterTheme(theme);
    const canEnter = canEnterTheme(theme);
    const hasProgress = Boolean(
      progress
      && isThemeStatus(progress.status)
      && progress.status !== THEME_STATUSES.AVAILABLE,
    );

    return {
      theme,
      progress,
      status,
      playable,
      locked,
      hasProgress,
      canEnter,
      actionLabel: locked
        ? '尚未開放'
        : hasProgress ? '繼續探險' : '開始冒險',
    };
  }

  canEnter(themeId) {
    return this.getThemeState(themeId)?.canEnter ?? false;
  }

  hasProgress(themeId) {
    return this.getThemeState(themeId)?.hasProgress ?? false;
  }

  getActionLabel(themeId) {
    return this.getThemeState(themeId)?.actionLabel ?? '尚未開放';
  }

  selectTheme(themeId) {
    const state = this.getThemeState(themeId);
    return state?.canEnter ? state.theme : null;
  }
}
