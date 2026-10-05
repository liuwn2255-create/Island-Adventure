import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { MAGIC_CASTLE_COLLECTIBLE_TYPES } from './magicCastleCollectibleConfig.js';
import { MAGIC_CASTLE_COLLECTIBLES } from './magicCastleConfig.js';
import { magicCastleGroundHeightAt } from './createMagicCastleScene.js';

const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, flatShading: true, ...options });

function buildCrystal(group) {
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 1), material('#70e1ff', { emissive: '#2289bd', emissiveIntensity: 0.82, metalness: 0.12 }));
  gem.name = 'MagicCollectibleCrystal'; gem.position.y = 0.52; gem.scale.y = 1.42; gem.castShadow = true; group.add(gem);
  group.add(new THREE.PointLight('#78e8ff', 0.48, 2.6));
}

function buildScroll(group) {
  const parchment = material('#e8d49a');
  const ink = material('#704079');
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.08), parchment);
  sheet.name = 'WizardScrollParchment'; sheet.position.y = 0.48; sheet.rotation.z = -0.14; sheet.castShadow = true; group.add(sheet);
  for (const x of [-0.31, 0.31]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 8), material('#ad8152'));
    roll.name = `WizardScrollRoll-${x}`; roll.rotation.z = Math.PI / 2; roll.position.set(x, 0.48, 0); group.add(roll);
  }
  for (let index = 0; index < 3; index += 1) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.025), ink);
    rune.position.set(0, 0.66 - index * 0.16, 0.05); group.add(rune);
  }
}

function buildKey(group) {
  const gold = material('#edc960', { metalness: 0.65, roughness: 0.3, emissive: '#715315', emissiveIntensity: 0.2 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 16), gold);
  ring.name = 'EnchantedKeyBow'; ring.position.set(0, 0.63, 0); group.add(ring);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.65, 8), gold);
  shaft.name = 'EnchantedKeyShaft'; shaft.position.set(0, 0.25, 0); shaft.rotation.z = Math.PI / 2; group.add(shaft);
  for (const [index, x, y] of [[1, 0.24, 0.08], [2, 0.32, -0.03]]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.1), gold);
    tooth.name = `EnchantedKeyTooth-${index}`; tooth.position.set(x, y, 0); group.add(tooth);
  }
}

function buildFairyGem(group) {
  const gem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.39, 1), material('#91f2ae', { emissive: '#287a4a', emissiveIntensity: 0.78, metalness: 0.18, roughness: 0.26 }));
  gem.name = 'FairyGem'; gem.position.y = 0.48; gem.scale.set(0.78, 1.25, 0.72); gem.rotation.y = 0.35; gem.castShadow = true; group.add(gem);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 6, 20), material('#d8fff0', { emissive: '#5ee3a5', emissiveIntensity: 0.42 }));
  orbit.name = 'FairyGemOrbit'; orbit.position.y = 0.48; orbit.rotation.x = 0.95; group.add(orbit);
  group.add(new THREE.PointLight('#9affc4', 0.45, 2.4));
}

function buildPotion(group) {
  const glass = material('#b8dcff', { transparent: true, opacity: 0.65, roughness: 0.2 });
  const liquid = material('#7351cc', { emissive: '#3f1c8f', emissiveIntensity: 0.65, roughness: 0.32 });
  const bottle = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 9), glass);
  bottle.name = 'MagicPotionBottle'; bottle.position.y = 0.39; bottle.scale.set(0.86, 1.05, 0.75); bottle.castShadow = true; group.add(bottle);
  const fluid = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), liquid);
  fluid.name = 'MagicPotionLiquid'; fluid.position.y = 0.3; fluid.scale.set(0.82, 0.68, 0.7); group.add(fluid);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8), glass);
  neck.position.y = 0.75; group.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 7), material('#93623e'));
  cork.name = 'MagicPotionCork'; cork.position.y = 0.98; group.add(cork);
  group.add(new THREE.PointLight('#a47aff', 0.34, 2));
}

export const MAGIC_CASTLE_COLLECTIBLE_VISUAL_BUILDERS = Object.freeze({
  'magic-crystal': buildCrystal,
  'wizard-scroll': buildScroll,
  'enchanted-key': buildKey,
  'fairy-gem': buildFairyGem,
  'magic-potion': buildPotion,
});

export function createMagicCastleCollectibles(
  scene,
  groundHeightAt = magicCastleGroundHeightAt,
  spawns = MAGIC_CASTLE_COLLECTIBLES,
  itemTypes = MAGIC_CASTLE_COLLECTIBLE_TYPES,
) {
  return createCollectibleItems(scene, groundHeightAt, spawns, itemTypes, MAGIC_CASTLE_COLLECTIBLE_VISUAL_BUILDERS);
}
