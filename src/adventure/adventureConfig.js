export const THEME_IDS = Object.freeze({
  MYSTERY_ISLAND: 'mystery-island',
  FOREST: 'forest',
  OCEAN: 'ocean',
  DINOSAUR: 'dinosaur',
  MAGIC_CASTLE: 'magic-castle',
  SPACE: 'space',
  ANCIENT_DESERT: 'ancient-desert',
});

export const THEME_STATUSES = Object.freeze({
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
});

export const THEME_COMPLETION_POLICY_TYPES = Object.freeze({
  DEFERRED: 'deferred',
  MANUAL: 'manual',
  REQUIRED_QUESTS: 'required-quests',
  REQUIRED_OBJECTIVES: 'required-objectives',
});

const deferredCompletionPolicy = Object.freeze({ type: THEME_COMPLETION_POLICY_TYPES.DEFERRED });

export const ADVENTURE_THEMES = Object.freeze([
  Object.freeze({
    id: THEME_IDS.MYSTERY_ISLAND,
    name: '🏝️ 神秘島',
    description: '探索海上的神秘島嶼，發現生物與古老地標。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: Object.freeze({
      type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
      questIds: Object.freeze(['crystal-explorer', 'island-adventurer', 'collector']),
    }),
  }),
  Object.freeze({
    id: THEME_IDS.FOREST,
    name: '🌲 神秘森林',
    description: '森林探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: Object.freeze({
      type: THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS,
      questIds: Object.freeze(['forest-explorer', 'forest-collector', 'forest-discoverer']),
    }),
  }),
  Object.freeze({
    id: THEME_IDS.OCEAN,
    name: '🌊 深海探險',
    description: '深海探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.DINOSAUR,
    name: '🦕 恐龍世界',
    description: '恐龍世界探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.MAGIC_CASTLE,
    name: '🏰 魔法城堡',
    description: '魔法城堡探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.SPACE,
    name: '🚀 太空探險',
    description: '太空探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.ANCIENT_DESERT,
    name: '🏜️ 古文明沙漠',
    description: '古文明沙漠探險即將展開。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
]);

export const THEME_PROGRESS_FIELDS = Object.freeze([
  'quests',
  'inventory',
  'collections',
  'discoveries',
  'nature',
  'natureQuests',
  'badges',
  'world',
  'hasSeenTutorial',
  'completion',
]);

const THEME_ID_SET = new Set(Object.values(THEME_IDS));
const THEME_STATUS_SET = new Set(Object.values(THEME_STATUSES));
const COMPLETION_POLICY_TYPE_SET = new Set(Object.values(THEME_COMPLETION_POLICY_TYPES));

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isThemeId(value) {
  return THEME_ID_SET.has(value);
}

export function isThemeStatus(value) {
  return THEME_STATUS_SET.has(value);
}

export function canEnterTheme(theme) {
  return isThemeMetadata(theme) && theme.playable;
}

export function isCompletionPolicy(policy) {
  if (!isRecord(policy) || !COMPLETION_POLICY_TYPE_SET.has(policy.type)) return false;

  if (policy.type === THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS) {
    return Array.isArray(policy.questIds) && policy.questIds.every((id) => typeof id === 'string' && id.length > 0);
  }
  if (policy.type === THEME_COMPLETION_POLICY_TYPES.REQUIRED_OBJECTIVES) {
    return Array.isArray(policy.objectiveIds) && policy.objectiveIds.every((id) => typeof id === 'string' && id.length > 0);
  }
  return true;
}

export function isThemeMetadata(theme) {
  return isRecord(theme)
    && isThemeId(theme.id)
    && typeof theme.name === 'string'
    && theme.name.trim().length > 0
    && typeof theme.description === 'string'
    && theme.description.trim().length > 0
    && isThemeStatus(theme.status)
    && typeof theme.playable === 'boolean'
    && isCompletionPolicy(theme.completionPolicy);
}

/** Creates only a contract-shaped placeholder; it does not import or move live game state. */
export function createThemeProgress(status = THEME_STATUSES.AVAILABLE) {
  if (!isThemeStatus(status)) throw new TypeError('Unknown theme status: ' + status);

  return {
    status,
    quests: null,
    inventory: null,
    collections: null,
    discoveries: null,
    nature: null,
    natureQuests: null,
    badges: null,
    world: null,
    hasSeenTutorial: false,
    completion: null,
  };
}

export function isThemeProgress(progress) {
  if (!isRecord(progress) || !isThemeStatus(progress.status)) return false;
  if (!THEME_PROGRESS_FIELDS.every((field) => Object.hasOwn(progress, field))) return false;
  return THEME_PROGRESS_FIELDS.every((field) => (
    field === 'hasSeenTutorial'
      ? typeof progress[field] === 'boolean'
      : progress[field] === null || isRecord(progress[field])
  ));
}
