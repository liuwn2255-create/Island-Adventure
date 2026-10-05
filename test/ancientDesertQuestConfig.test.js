import assert from 'node:assert/strict';
import test from 'node:test';
import { ANCIENT_DESERT_COLLECTIBLES, ANCIENT_DESERT_LANDMARKS } from '../src/themes/ancient-desert/ancientDesertConfig.js';
import { ANCIENT_DESERT_QUESTS } from '../src/themes/ancient-desert/ancientDesertQuestConfig.js';

test('Ancient Desert quests use the configured landmarks and collectible spawn IDs', () => {
  assert.deepEqual(ANCIENT_DESERT_QUESTS.map(({ id }) => id), [
    'ancient-desert-explorer', 'ancient-desert-collector', 'ancient-desert-discoverer',
  ]);
  assert.equal(new Set(ANCIENT_DESERT_QUESTS.map(({ id }) => id)).size, 3);
  assert.ok(ANCIENT_DESERT_QUESTS.every(({ name, description }) => name && description));
  const [explorer, collector, discoverer] = ANCIENT_DESERT_QUESTS;
  assert.equal(explorer.requiredAmount, 3);
  assert.equal(explorer.target, 3);
  assert.equal(explorer.type, 'explore_landmark');
  assert.deepEqual(explorer.objective.landmarkIds, ANCIENT_DESERT_LANDMARKS.map(({ id }) => id));
  assert.equal(collector.requiredAmount, 5);
  assert.equal(collector.target, 5);
  assert.equal(collector.type, 'collect_any');
  assert.deepEqual(collector.objective.collectibleIds, ANCIENT_DESERT_COLLECTIBLES.map(({ id }) => id));
  assert.equal(discoverer.requiredAmount, 2);
  assert.equal(discoverer.target, 2);
  assert.equal(discoverer.type, 'explore_landmark');
  assert.deepEqual(discoverer.objective.landmarkIds, ANCIENT_DESERT_LANDMARKS.map(({ id }) => id));
});
