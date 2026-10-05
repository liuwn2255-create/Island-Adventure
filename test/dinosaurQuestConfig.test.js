import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVENTURE_THEMES, THEME_COMPLETION_POLICY_TYPES, THEME_IDS } from '../src/adventure/adventureConfig.js';
import { SAVE_VERSION } from '../src/save/saveConfig.js';
import { DINOSAUR_COLLECTIBLES } from '../src/themes/dinosaur/dinosaurCollectibleConfig.js';
import { DINOSAUR_LANDMARKS } from '../src/themes/dinosaur/dinosaurConfig.js';
import { DINOSAUR_QUESTS } from '../src/themes/dinosaur/dinosaurQuestConfig.js';

test('Dinosaur defines three unique named quests with descriptions and required amounts', () => {
  assert.equal(DINOSAUR_QUESTS.length, 3);
  const ids = DINOSAUR_QUESTS.map(({ id }) => id);
  assert.deepEqual(ids, ['dinosaur-explorer', 'dinosaur-collector', 'dinosaur-discoverer']);
  assert.equal(new Set(ids).size, 3);
  assert.ok(DINOSAUR_QUESTS.every(({ name, title, description, requiredAmount }) => (
    name && title === name && description && Number.isInteger(requiredAmount) && requiredAmount > 0
  )));
});

test('Dinosaur quest objectives preserve the requested landmark and collectible conditions', () => {
  const byId = new Map(DINOSAUR_QUESTS.map((quest) => [quest.id, quest]));
  const landmarkIds = DINOSAUR_LANDMARKS.map(({ id }) => id);
  const collectibleIds = DINOSAUR_COLLECTIBLES.map(({ id }) => id);

  const explorer = byId.get('dinosaur-explorer');
  assert.equal(explorer.requiredAmount, 3);
  assert.equal(explorer.type, 'explore_landmark');
  assert.equal(explorer.target, 3);
  assert.deepEqual(explorer.objective.landmarkIds, landmarkIds);
  assert.equal(explorer.objective.distinct, true);

  const collector = byId.get('dinosaur-collector');
  assert.equal(collector.requiredAmount, 5);
  assert.equal(collector.type, 'collect_any');
  assert.equal(collector.target, 5);
  assert.deepEqual(collector.objective.collectibleIds, collectibleIds);

  const discoverer = byId.get('dinosaur-discoverer');
  assert.equal(discoverer.requiredAmount, 2);
  assert.equal(discoverer.type, 'explore_landmark');
  assert.equal(discoverer.target, 2);
  assert.deepEqual(discoverer.objective.landmarkIds, landmarkIds);
  assert.equal(discoverer.objective.distinct, true);
});

test('Dinosaur quest references use configured IDs and Adventure requires exactly these quests without changing Save v2', () => {
  const validLandmarkIds = new Set(DINOSAUR_LANDMARKS.map(({ id }) => id));
  const validCollectibleIds = new Set(DINOSAUR_COLLECTIBLES.map(({ id }) => id));
  for (const quest of DINOSAUR_QUESTS) {
    if (quest.objective.landmarkIds) {
      assert.ok(quest.objective.landmarkIds.every((id) => validLandmarkIds.has(id)));
    }
    if (quest.objective.collectibleIds) {
      assert.ok(quest.objective.collectibleIds.every((id) => validCollectibleIds.has(id)));
    }
  }

  const dinosaurTheme = ADVENTURE_THEMES.find(({ id }) => id === THEME_IDS.DINOSAUR);
  assert.equal(dinosaurTheme.completionPolicy.type, THEME_COMPLETION_POLICY_TYPES.REQUIRED_QUESTS);
  assert.deepEqual(dinosaurTheme.completionPolicy.questIds, DINOSAUR_QUESTS.map(({ id }) => id));
  assert.equal(SAVE_VERSION, 2);
});
