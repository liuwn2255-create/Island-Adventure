import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { QuestManager } from '../src/quests/QuestManager.js';
import { OceanRuntime } from '../src/themes/ocean/OceanRuntime.js';
import { OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES, OCEAN_LANDMARKS, OCEAN_QUESTS } from '../src/themes/ocean/oceanConfig.js';
import { DinosaurRuntime } from '../src/themes/dinosaur/DinosaurRuntime.js';
import { DINOSAUR_LANDMARKS } from '../src/themes/dinosaur/dinosaurConfig.js';
import { DINOSAUR_COLLECTIBLES, DINOSAUR_COLLECTIBLE_TYPES } from '../src/themes/dinosaur/dinosaurCollectibleConfig.js';
import { DINOSAUR_QUESTS } from '../src/themes/dinosaur/dinosaurQuestConfig.js';
import { AncientDesertRuntime } from '../src/themes/ancient-desert/AncientDesertRuntime.js';
import { ANCIENT_DESERT_COLLECTIBLES, ANCIENT_DESERT_LANDMARKS } from '../src/themes/ancient-desert/ancientDesertConfig.js';
import { ANCIENT_DESERT_COLLECTIBLE_TYPES } from '../src/themes/ancient-desert/ancientDesertCollectibleConfig.js';
import { ANCIENT_DESERT_QUESTS } from '../src/themes/ancient-desert/ancientDesertQuestConfig.js';
import { SpaceRuntime } from '../src/themes/space/SpaceRuntime.js';
import { SPACE_LANDMARKS } from '../src/themes/space/spaceConfig.js';
import { SPACE_COLLECTIBLES, SPACE_COLLECTIBLE_TYPES } from '../src/themes/space/spaceCollectibleConfig.js';
import { SPACE_QUESTS } from '../src/themes/space/spaceQuestConfig.js';
import { MagicCastleRuntime } from '../src/themes/magic-castle/MagicCastleRuntime.js';
import { MAGIC_CASTLE_COLLECTIBLES, MAGIC_CASTLE_LANDMARKS } from '../src/themes/magic-castle/magicCastleConfig.js';
import { MAGIC_CASTLE_COLLECTIBLE_TYPES } from '../src/themes/magic-castle/magicCastleCollectibleConfig.js';
import { MAGIC_CASTLE_QUESTS } from '../src/themes/magic-castle/magicCastleQuestConfig.js';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});

const worlds = [
  { name: 'Ocean', Runtime: OceanRuntime, quests: OCEAN_QUESTS, landmarks: OCEAN_LANDMARKS, spawns: OCEAN_COLLECTIBLES, types: OCEAN_COLLECTIBLE_TYPES },
  { name: 'Dinosaur', Runtime: DinosaurRuntime, quests: DINOSAUR_QUESTS, landmarks: DINOSAUR_LANDMARKS, spawns: DINOSAUR_COLLECTIBLES, types: DINOSAUR_COLLECTIBLE_TYPES },
  { name: 'Ancient Desert', Runtime: AncientDesertRuntime, quests: ANCIENT_DESERT_QUESTS, landmarks: ANCIENT_DESERT_LANDMARKS, spawns: ANCIENT_DESERT_COLLECTIBLES, types: ANCIENT_DESERT_COLLECTIBLE_TYPES },
  { name: 'Space', Runtime: SpaceRuntime, quests: SPACE_QUESTS, landmarks: SPACE_LANDMARKS, spawns: SPACE_COLLECTIBLES, types: SPACE_COLLECTIBLE_TYPES },
  { name: 'Magic Castle', Runtime: MagicCastleRuntime, quests: MAGIC_CASTLE_QUESTS, landmarks: MAGIC_CASTLE_LANDMARKS, spawns: MAGIC_CASTLE_COLLECTIBLES, types: MAGIC_CASTLE_COLLECTIBLE_TYPES },
];

function createHarness({ Runtime, quests, landmarks, spawns, types }) {
  const runtime = Object.create(Runtime.prototype);
  const questManager = new QuestManager(quests);
  runtime.questManager = questManager;
  runtime.landmarks = landmarks.map((landmark) => ({
    ...landmark,
    title: landmark.name,
    position: { ...landmark.position, y: 0 },
    interactionDistance: landmark.interactionDistance ?? 2.5,
  }));
  const typeById = new Map(types.map((type) => [type.id, type]));
  runtime.items = spawns.map((spawn) => ({
    ...spawn,
    ...typeById.get(spawn.type),
    id: spawn.id,
    type: spawn.type,
    position: { ...spawn.position, y: 0 },
    collected: false,
  }));
  runtime.player = { object3D: { position: { x: 0, z: 0 } } };
  return { runtime, questManager };
}

for (const world of worlds) {
  test(`${world.name} navigation follows its objective IDs, advances, and hides when all targets are complete`, () => {
    const { runtime, questManager } = createHarness(world);
    const target = runtime.getDirectionTarget();
    assert.equal(target?.taskId, world.quests[0].id);
    assert.equal(target?.kind, 'landmark');
    assert.ok(world.landmarks.some(({ id }) => id === target.id));
    assert.deepEqual(target.position, runtime.landmarks.find(({ id }) => id === target.id).position);

    const firstLandmark = target.id;
    questManager.recordLandmarkExplored(firstLandmark);
    const nextLandmarkTarget = runtime.getDirectionTarget();
    assert.equal(nextLandmarkTarget?.taskId, world.quests[0].id);
    assert.notEqual(nextLandmarkTarget?.id, firstLandmark);
    assert.ok(world.landmarks.some(({ id }) => id === nextLandmarkTarget.id));

    for (const landmark of runtime.landmarks) questManager.recordLandmarkExplored(landmark.id);
    const collectibleTarget = runtime.getDirectionTarget();
    assert.equal(collectibleTarget?.taskId, world.quests[1].id);
    assert.equal(collectibleTarget?.kind, 'item');
    assert.ok(world.spawns.some(({ id }) => id === collectibleTarget.id));

    questManager.recordCollection(collectibleTarget.id, collectibleTarget.type);
    const nextCollectibleTarget = runtime.getDirectionTarget();
    assert.equal(nextCollectibleTarget?.taskId, world.quests[1].id);
    assert.notEqual(nextCollectibleTarget?.id, collectibleTarget.id);
    assert.ok(world.spawns.some(({ id }) => id === nextCollectibleTarget.id));

    for (const item of runtime.items) questManager.recordCollection(item.id, item.type);
    assert.equal(runtime.getDirectionTarget(), null);
  });
}

test('the original ItemDirectionIndicator updates direction and distance, hides for no target, and disposes', async () => {
  class FakeElement {
    constructor() { this.hidden = false; this.children = []; this.textContent = ''; }
    setAttribute() {}
    appendChild(child) { this.children.push(child); }
    querySelector() { return new FakeElement(); }
    remove() { this.removed = true; }
  }
  const previousDocument = globalThis.document;
  const app = new FakeElement();
  globalThis.document = { createElement: () => new FakeElement() };
  try {
    const { ItemDirectionIndicator } = await import('../src/items/ItemDirectionIndicator.js');
    let target = { id: 'magic-castle', kind: 'landmark', name: '魔法城堡', icon: '🏰', position: { x: 0, z: -10 }, interactionDistance: 2 };
    const player = { object3D: { position: { x: 0, z: 0 } } };
    const indicator = new ItemDirectionIndicator({ app, player, getTarget: () => target, getCameraForward: () => ({ x: 0, z: -1 }) });
    indicator.update();
    assert.equal(indicator.element.hidden, false);
    assert.equal(indicator.name.textContent, '魔法城堡');
    assert.equal(indicator.arrow.textContent, '↑');
    assert.equal(indicator.distance.textContent, '約 10m');

    player.object3D.position.x = 8;
    indicator.update();
    assert.equal(indicator.arrow.textContent, '↖');
    assert.equal(indicator.distance.textContent, '約 13m');

    target = null;
    indicator.update();
    assert.equal(indicator.element.hidden, true);
    indicator.dispose();
    assert.equal(indicator.element.removed, true);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
