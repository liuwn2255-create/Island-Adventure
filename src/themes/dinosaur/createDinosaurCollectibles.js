import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { DINOSAUR_COLLECTIBLES, DINOSAUR_COLLECTIBLE_TYPES } from './dinosaurCollectibleConfig.js';
import { dinosaurGroundHeightAt } from './createDinosaurScene.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true, ...options });
}

function addFossil(group) {
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), material('#80684a'));
  stone.name = 'DinosaurFossilRock';
  stone.position.y = 0.28;
  stone.scale.set(1.2, 0.7, 0.85);
  stone.castShadow = true;
  group.add(stone);

  const bone = material('#ead9b3');
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.56, 7), bone);
  spine.name = 'DinosaurFossilBone';
  spine.rotation.z = Math.PI / 2;
  spine.position.y = 0.45;
  spine.castShadow = true;
  group.add(spine);
  for (let side = -1; side <= 1; side += 2) {
    const rib = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), bone);
    rib.name = `DinosaurFossilRib-${side}`;
    rib.position.set(side * 0.2, 0.48, 0.1);
    rib.scale.set(0.55, 0.6, 1.5);
    group.add(rib);
  }
}

function addEgg(group) {
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), material('#d8c18c'));
  egg.name = 'DinosaurEggOval';
  egg.position.y = 0.36;
  egg.scale.set(0.78, 1.32, 0.78);
  egg.rotation.z = -0.12;
  egg.castShadow = true;
  group.add(egg);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), material('#b59b68'));
  spot.name = 'DinosaurEggMark';
  spot.position.set(0.13, 0.48, 0.22);
  group.add(spot);
}

function addFeather(group) {
  const vaneMaterial = material('#607b45', { side: THREE.DoubleSide });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.92, 6), material('#d6c49a'));
  shaft.name = 'DinosaurFeatherShaft';
  shaft.position.y = 0.49;
  shaft.rotation.z = 0.18;
  group.add(shaft);

  for (let index = 0; index < 5; index += 1) {
    const y = 0.2 + index * 0.14;
    for (const side of [-1, 1]) {
      const barb = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.3, 5), vaneMaterial);
      barb.name = `DinosaurFeatherBarb-${index}-${side}`;
      barb.position.set(side * (0.1 + index * 0.015), y, 0);
      barb.rotation.z = side < 0 ? Math.PI / 2 + 0.22 : -Math.PI / 2 - 0.22;
      barb.scale.z = 0.32;
      group.add(barb);
    }
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), vaneMaterial);
  tip.name = 'DinosaurFeatherTip';
  tip.position.y = 1.04;
  group.add(tip);
}

function addTooth(group) {
  const enamel = material('#f0e7ce');
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.72, 8), enamel);
  crown.name = 'DinosaurToothPoint';
  crown.position.y = 0.42;
  crown.rotation.z = Math.PI;
  crown.castShadow = true;
  group.add(crown);
  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.18, 8), material('#c7b895'));
  root.name = 'DinosaurToothRoot';
  root.position.y = 0.82;
  group.add(root);
}

function addAmber(group) {
  const amber = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.39, 1),
    material('#d77b20', { color: '#e89a2c', emissive: '#713708', emissiveIntensity: 0.28, metalness: 0.12, roughness: 0.32 }),
  );
  amber.name = 'DinosaurAmberCrystal';
  amber.position.y = 0.43;
  amber.scale.set(0.82, 1.18, 0.78);
  amber.rotation.set(0.18, 0.3, 0.12);
  amber.castShadow = true;
  group.add(amber);
  const inclusion = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), material('#70431e'));
  inclusion.name = 'DinosaurAmberInclusion';
  inclusion.position.set(0.02, 0.44, 0.08);
  group.add(inclusion);
}

export const DINOSAUR_COLLECTIBLE_VISUAL_BUILDERS = Object.freeze({
  'dinosaur-fossil': addFossil,
  'dinosaur-egg': addEgg,
  'dinosaur-feather': addFeather,
  'dinosaur-tooth': addTooth,
  'dinosaur-amber': addAmber,
});

/** Builds Dinosaur-specific visuals through the project's existing collectible API. */
export function createDinosaurCollectibles(
  scene,
  groundHeightAt = dinosaurGroundHeightAt,
  spawns = DINOSAUR_COLLECTIBLES,
  itemTypes = DINOSAUR_COLLECTIBLE_TYPES,
) {
  return createCollectibleItems(scene, groundHeightAt, spawns, itemTypes, DINOSAUR_COLLECTIBLE_VISUAL_BUILDERS);
}
