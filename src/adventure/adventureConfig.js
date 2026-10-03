export const THEME_IDS = Object.freeze({
  MYSTERY_ISLAND: 'mystery-island',
  FOREST: 'forest',
  OCEAN: 'ocean',
  DINOSAUR: 'dinosaur',
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
    name: '神秘島嶼',
    description: '探索海上的神秘島嶼，發現生物與古老地標。',
    status: THEME_STATUSES.AVAILABLE,
    playable: true,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.FOREST,
    name: '森林探險',
    description: '森林主題預留位置，目前尚未開放。',
    status: THEME_STATUSES.LOCKED,
    playable: false,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.OCEAN,
    name: '海洋探險',
    description: '海洋主題預留位置，目前尚未開放。',
    status: THEME_STATUSES.LOCKED,
    playable: false,
    completionPolicy: deferredCompletionPolicy,
  }),
  Object.freeze({
    id: THEME_IDS.DINOSAUR,
    name: '恐龍世界',
    description: '恐龍主題預留位置，目前尚未開放。',
    status: THEME_STATUSES.LOCKED,
    playable: false,
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
  return isThemeMetadata(theme)
    && theme.playable
    && theme.status !== THEME_STATUSES.LOCKED;
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
