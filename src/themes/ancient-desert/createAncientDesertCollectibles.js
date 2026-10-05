import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { ANCIENT_DESERT_COLLECTIBLE_TYPES } from './ancientDesertCollectibleConfig.js';
import { ANCIENT_DESERT_COLLECTIBLES } from './ancientDesertConfig.js';
import { ancientDesertGroundHeightAt } from './createAncientDesertScene.js';

const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true, ...options });

function addScarab(group) {
  const gold = material('#c58a2b', { metalness: 0.55, roughness: 0.38 });
  const dark = material('#704a24', { metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), gold);
  body.name = 'AncientDesertScarabBody';
  body.position.y = 0.38;
  body.scale.set(1, 0.72, 1.28);
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), dark);
  head.name = 'AncientDesertScarabHead';
  head.position.set(0, 0.4, 0.39);
  group.add(head);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), material('#d8a341', { metalness: 0.48 }));
    wing.name = `AncientDesertScarabWing-${side}`;
    wing.position.set(side * 0.19, 0.43, -0.04);
    wing.scale.set(0.82, 0.42, 1.05);
    group.add(wing);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 5), dark);
    leg.name = `AncientDesertScarabLeg-${side}`;
    leg.position.set(side * 0.3, 0.2, 0.03);
    leg.rotation.z = side * 0.72;
    group.add(leg);
  }
}

function addGem(group) {
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 1),
    material('#34b9ae', { color: '#49c8bd', emissive: '#12574f', emissiveIntensity: 0.25, metalness: 0.18, roughness: 0.26 }),
  );
  gem.name = 'AncientDesertGemCrystal';
  gem.position.y = 0.48;
  gem.scale.set(0.88, 1.35, 0.82);
  gem.rotation.set(0.12, 0.35, 0.08);
  gem.castShadow = true;
  group.add(gem);
  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), material('#8a653d'));
  base.name = 'AncientDesertGemMatrix';
  base.position.y = 0.18;
  base.scale.set(1.35, 0.45, 1.2);
  group.add(base);
}

function addCoin(group) {
  const gold = material('#e2b449', { metalness: 0.72, roughness: 0.28 });
  const darkGold = material('#92641d', { metalness: 0.48, roughness: 0.4 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.13, 16), gold);
  coin.name = 'AncientDesertCoinDisc';
  coin.position.y = 0.22;
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  group.add(coin);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 8), darkGold);
  seal.name = 'AncientDesertCoinSeal';
  seal.position.set(0, 0.22, 0.075);
  group.add(seal);
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), gold);
  center.name = 'AncientDesertCoinEmblem';
  center.position.set(0, 0.25, 0.1);
  group.add(center);
}

function addTablet(group) {
  const stone = material('#a98252');
  const etching = material('#57452f');
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.94, 0.2), stone);
  slab.name = 'AncientDesertTabletSlab';
  slab.position.y = 0.49;
  slab.rotation.z = -0.12;
  slab.castShadow = true;
  group.add(slab);
  for (let index = 0; index < 4; index += 1) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.32 - (index % 2) * 0.06, 0.045, 0.025), etching);
    rune.name = `AncientDesertTabletRune-${index + 1}`;
    rune.position.set((index % 2 ? 0.02 : -0.04), 0.76 - index * 0.18, 0.115);
    rune.rotation.z = index % 2 ? 0.22 : -0.16;
    group.add(rune);
  }
}

function addCrown(group) {
  const gold = material('#d5a533', { metalness: 0.62, roughness: 0.32 });
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 6, 12), gold);
  base.name = 'AncientDesertCrownBand';
  base.position.y = 0.34;
  base.rotation.x = Math.PI / 2;
  group.add(base);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.56, 5), gold);
    point.name = `AncientDesertCrownPoint-${index + 1}`;
    point.position.set(Math.cos(angle) * 0.31, 0.66, Math.sin(angle) * 0.31);
    point.rotation.z = Math.cos(angle) * -0.24;
    point.rotation.x = Math.sin(angle) * 0.24;
    group.add(point);
  }
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), material('#4bb4a5', { emissive: '#174d45', emissiveIntensity: 0.2 }));
  jewel.name = 'AncientDesertCrownJewel';
  jewel.position.set(0, 0.52, 0.33);
  group.add(jewel);
}

export const ANCIENT_DESERT_COLLECTIBLE_VISUAL_BUILDERS = Object.freeze({
  'ancient-desert-scarab': addScarab,
  'ancient-desert-gem': addGem,
  'ancient-desert-coin': addCoin,
  'ancient-desert-tablet': addTablet,
  'ancient-desert-crown': addCrown,
});

export function createAncientDesertCollectibles(
  scene,
  groundHeightAt = ancientDesertGroundHeightAt,
  spawns = ANCIENT_DESERT_COLLECTIBLES,
  itemTypes = ANCIENT_DESERT_COLLECTIBLE_TYPES,
) {
  return createCollectibleItems(scene, groundHeightAt, spawns, itemTypes, ANCIENT_DESERT_COLLECTIBLE_VISUAL_BUILDERS);
}
