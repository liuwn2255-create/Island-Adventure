import {
  THEME_IDS,
  THEME_STATUSES,
  createThemeProgress,
  isThemeId,
  isThemeProgress,
} from '../adventure/adventureConfig.js';

export const MIGRATED_SAVE_VERSION = 2;
export const LEGACY_SAVE_VERSION = 1;
export const LEGACY_THEME_ID = THEME_IDS.MYSTERY_ISLAND;

export const V1_THEME_SCOPED_FIELDS = Object.freeze([
  'inventory',
  'quests',
  'badges',
  'nature',
  'natureQuests',
  'world',
  'hasSeenTutorial',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, cloneJsonValue(nestedValue)]),
  );
}

/** Validates the proposed v2 envelope without changing SaveManager or storage behavior. */
export function isV2SaveData(data) {
  const mysteryIsland = data?.themeProgress?.[LEGACY_THEME_ID];
  return isRecord(data)
    && data.version === MIGRATED_SAVE_VERSION
    && typeof data.characterId === 'string'
    && data.characterId.trim().length > 0
    && isRecord(data.themeProgress)
    && isThemeProgress(mysteryIsland)
    && ['inventory', 'quests', 'badges', 'nature', 'world'].every((field) => isRecord(mysteryIsland[field]))
    && (mysteryIsland.natureQuests === null || isRecord(mysteryIsland.natureQuests))
    && Object.entries(data.themeProgress).every(([themeId, progress]) => (
      isThemeId(themeId) && isThemeProgress(progress)
    ))
    && (!Object.hasOwn(data, 'legacyData') || isRecord(data.legacyData));
}

/**
 * Converts a parsed v1 save into the proposed v2 shape.
 * Returns a result object and never mutates the input or accesses browser storage.
 */
export function migrateSaveData(data) {
  if (!isRecord(data) || !Number.isInteger(data.version)) {
    return { ok: false, status: 'invalid-data', data: null };
  }

  if (data.version === MIGRATED_SAVE_VERSION) {
    if (!isV2SaveData(data)) return { ok: false, status: 'invalid-v2-data', data: null };
    return { ok: true, status: 'already-v2', data: cloneJsonValue(data) };
  }

  if (data.version !== LEGACY_SAVE_VERSION) {
    return { ok: false, status: 'unsupported-version', data: null, sourceVersion: data.version };
  }

  if (typeof data.characterId !== 'string' || data.characterId.trim().length === 0
    || (Object.hasOwn(data, 'hasSeenTutorial') && typeof data.hasSeenTutorial !== 'boolean')) {
    return { ok: false, status: 'invalid-v1-data', data: null };
  }

  const themeState = createThemeProgress(THEME_STATUSES.IN_PROGRESS);
  const legacyData = {};
  const knownFields = new Set(['version', 'characterId', ...V1_THEME_SCOPED_FIELDS]);

  for (const field of V1_THEME_SCOPED_FIELDS) {
    if (Object.hasOwn(data, field)) themeState[field] = cloneJsonValue(data[field]);
  }

  for (const [key, value] of Object.entries(data)) {
    if (!knownFields.has(key)) {
      Object.defineProperty(legacyData, key, {
        value: cloneJsonValue(value),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }

  const migrated = {
    version: MIGRATED_SAVE_VERSION,
    characterId: data.characterId,
    themeProgress: {
      [LEGACY_THEME_ID]: themeState,
    },
  };

  if (Object.keys(legacyData).length > 0) migrated.legacyData = legacyData;

  return { ok: true, status: 'migrated', data: migrated };
}
