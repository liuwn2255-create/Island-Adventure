import assert from 'node:assert/strict';
import * as THREE from 'three';
import test from 'node:test';
import { InventoryManager } from '../src/items/InventoryManager.js';
import { createCollectibleItems } from '../src/items/createCollectibleItems.js';
import { ITEM_SPAWNS, ITEM_TYPES } from '../src/items/itemConfig.js';
import { QuestManager } from '../src/quests/QuestManager.js';
import { FOREST_COLLECTIBLE_TYPES, FOREST_COLLECTIBLES, FOREST_QUESTS } from '../src/themes/forest/forestConfig.js';
import { FOREST_COLLECTIBLE_VISUAL_BUILDERS } from '../src/themes/forest/createForestCollectibleVisuals.js';
import { OCEAN_COLLECTIBLE_TYPES, OCEAN_COLLECTIBLES, OCEAN_QUESTS } from '../src/themes/ocean/oceanConfig.js';

test('theme-specific collectible definitions create named items and collect_any still counts them', () => {
  for (const [spawns, types, quests] of [
    [FOREST_COLLECTIBLES, FOREST_COLLECTIBLE_TYPES, FOREST_QUESTS],
    [OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES, OCEAN_QUESTS],
  ]) {
    const scene = new THREE.Scene();
    const visualBuilders = types === FOREST_COLLECTIBLE_TYPES ? FOREST_COLLECTIBLE_VISUAL_BUILDERS : undefined;
    const items = createCollectibleItems(scene, () => 0, spawns.slice(0, 1), types, visualBuilders);
    const item = items[0];
    const definition = types.find(({ id }) => id === item.type);
    const inventory = new InventoryManager(types);
    const questManager = new QuestManager(quests);

    assert.equal(item.name, definition.name);
    assert.equal(item.icon, definition.icon);
    assert.equal(inventory.add(item.type), 1);
    assert.equal(questManager.recordCollection(item.id, item.type), true);
    assert.equal(questManager.getSnapshot().find(({ type }) => type === 'collect_any').progress, 1);
  }
});

test('Forest and Ocean inventory state uses separate Theme-specific IDs', () => {
  const forestInventory = new InventoryManager(FOREST_COLLECTIBLE_TYPES);
  const oceanInventory = new InventoryManager(OCEAN_COLLECTIBLE_TYPES);
  forestInventory.add('forest-magic-mushroom');
  oceanInventory.add('ocean-deep-pearl');

  assert.deepEqual(forestInventory.saveState(), { counts: {
    'forest-magic-mushroom': 1,
    'forest-ancient-seed': 0,
    'forest-butterfly-specimen': 0,
    'forest-forest-feather': 0,
    'forest-fairy-leaf': 0,
  } });
  assert.deepEqual(oceanInventory.saveState(), { counts: {
    'ocean-deep-pearl': 1,
    'ocean-coral': 0,
    'ocean-deep-gem': 0,
    'ocean-sunken-treasure': 0,
    'ocean-mysterious-scale': 0,
  } });
});

test('Mystery Island keeps the existing default collectible definitions and names', () => {
  const scene = new THREE.Scene();
  const [item] = createCollectibleItems(scene, () => 0, ITEM_SPAWNS.slice(0, 1));
  const definition = ITEM_TYPES.find(({ id }) => id === item.type);
  assert.equal(item.type, 'ancient-coin');
  assert.equal(item.name, definition.name);
  assert.equal(item.icon, definition.icon);
});
