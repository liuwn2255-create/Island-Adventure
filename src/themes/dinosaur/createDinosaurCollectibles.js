import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { DINOSAUR_COLLECTIBLES, DINOSAUR_COLLECTIBLE_TYPES } from './dinosaurCollectibleConfig.js';
import { dinosaurGroundHeightAt } from './createDinosaurScene.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true, ...options });
}

function addFossil(group) {
  const sediment = new THREE.Mesh(new THREE.DodecahedronGeometry(0.49, 0), material('#80684a'));
  sediment.name = 'DinosaurFossilSediment';
  sediment.position.y = 0.2;
  sediment.scale.set(1.45, 0.5, 0.95);
  sediment.castShadow = true;
  group.add(sediment);

  const bone = material('#ead9b3', { roughness: 0.68 });
  const joint = new THREE.MeshStandardMaterial({ color: '#d6c39d', roughness: 0.76, flatShading: true });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.065, 0.9, 7), bone);
  spine.name = 'DinosaurFossilBackbone';
  spine.rotation.z = Math.PI / 2;
  spine.position.set(0.02, 0.48, 0);
  spine.castShadow = true;
  group.add(spine);
  for (let index = 0; index < 5; index += 1) {
    const vertebra = new THREE.Mesh(new THREE.SphereGeometry(0.085 - index * 0.004, 7, 5), joint);
    vertebra.name = `DinosaurFossilVertebra-${index + 1}`;
    vertebra.position.set(-0.34 + index * 0.17, 0.49, 0);
    vertebra.scale.set(1, 0.82, 1.08);
    group.add(vertebra);
  }
  for (let index = 0; index < 3; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 5, 12, Math.PI), bone);
    rib.name = `DinosaurFossilRib-${index + 1}`;
    rib.rotation.set(Math.PI / 2, 0, Math.PI);
    rib.position.set(-0.08 + index * 0.18, 0.49, 0);
    rib.scale.set(0.78, 1.15, 1);
    group.add(rib);
  }

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), bone);
  skull.name = 'DinosaurFossilSkull';
  skull.position.set(0.57, 0.53, 0);
  skull.scale.set(1.18, 0.74, 0.84);
  skull.castShadow = true;
  group.add(skull);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 7), bone);
  snout.name = 'DinosaurFossilSnout';
  snout.position.set(0.77, 0.47, 0);
  snout.rotation.z = -Math.PI / 2;
  group.add(snout);
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), material('#594b3c'));
    socket.name = `DinosaurFossilEyeSocket-${side}`;
    socket.position.set(0.58, 0.58, side * 0.13);
    group.add(socket);
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 5), joint);
    tooth.name = `DinosaurFossilTooth-${side}`;
    tooth.position.set(0.73, 0.35, side * 0.07);
    tooth.rotation.z = Math.PI;
    group.add(tooth);
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
