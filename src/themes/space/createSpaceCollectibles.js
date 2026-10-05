import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { SPACE_COLLECTIBLES, SPACE_COLLECTIBLE_TYPES } from './spaceCollectibleConfig.js';
import { spaceGroundHeightAt } from './createSpaceScene.js';

const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.66, flatShading: true, ...options });

function crystal(group) {
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), material('#5fe2ff', { emissive: '#1584bc', emissiveIntensity: 0.75, metalness: 0.12 }));
  gem.name = 'SpaceEnergyCrystal'; gem.position.y = 0.48; gem.scale.y = 1.35; gem.castShadow = true; group.add(gem);
  group.add(new THREE.PointLight('#67dfff', 0.45, 2.2));
}
function star(group) {
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.31, 1), material('#ffdc68', { emissive: '#ed8f23', emissiveIntensity: 0.9, metalness: 0.16 }));
  core.name = 'SpaceMysteryStarCore'; core.position.y = 0.46; group.add(core);
  for (let index = 0; index < 4; index += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 5), material('#fff0a5', { emissive: '#e4a632', emissiveIntensity: 0.35 }));
    spike.name = `SpaceStarRay-${index + 1}`;
    const angle = index * Math.PI / 2;
    spike.position.set(Math.cos(angle) * 0.3, 0.46, Math.sin(angle) * 0.3);
    spike.rotation.z = -Math.cos(angle) * Math.PI / 2;
    spike.rotation.x = Math.sin(angle) * Math.PI / 2;
    group.add(spike);
  }
}
function metal(group) {
  const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.39, 0), material('#8a9baa', { metalness: 0.78, roughness: 0.3 }));
  shard.name = 'SpaceAlienMetal'; shard.position.y = 0.31; shard.scale.set(1.2, 0.55, 0.7); shard.rotation.set(0.25, 0.4, -0.15); shard.castShadow = true; group.add(shard);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), material('#55d7db', { emissive: '#168b8e', emissiveIntensity: 0.45 }));
  inset.position.set(0, 0.41, 0.24); group.add(inset);
}
function artifact(group) {
  const body = new THREE.Mesh(new THREE.TorusKnotGeometry(0.27, 0.09, 48, 8, 2, 3), material('#ad75dd', { emissive: '#4a206f', emissiveIntensity: 0.4, metalness: 0.28 }));
  body.name = 'SpaceAlienArtifact'; body.position.y = 0.5; body.rotation.x = 0.35; body.castShadow = true; group.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), material('#a6f6e8', { emissive: '#24a88f', emissiveIntensity: 0.8 }));
  core.position.y = 0.5; group.add(core);
}
function capsule(group) {
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.48, 4, 8), material('#d5e2ed', { metalness: 0.4 }));
  shell.name = 'SpaceCapsulePart'; shell.position.y = 0.36; shell.rotation.z = Math.PI / 2; shell.castShadow = true; group.add(shell);
  for (const x of [-0.22, 0.22]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 6, 12), material('#e99454', { metalness: 0.25 }));
    ring.position.set(x, 0.36, 0); ring.rotation.y = Math.PI / 2; group.add(ring);
  }
}

export const SPACE_COLLECTIBLE_VISUAL_BUILDERS = Object.freeze({
  'space-crystal': crystal,
  'space-star': star,
  'space-metal': metal,
  'space-artifact': artifact,
  'space-capsule': capsule,
});

export function createSpaceCollectibles(scene, groundHeightAt = spaceGroundHeightAt) {
  return createCollectibleItems(scene, groundHeightAt, SPACE_COLLECTIBLES, SPACE_COLLECTIBLE_TYPES, SPACE_COLLECTIBLE_VISUAL_BUILDERS);
}
