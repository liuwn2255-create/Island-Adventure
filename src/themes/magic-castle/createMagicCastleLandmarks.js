import * as THREE from 'three';
import { INTERACTION_DISTANCE } from '../../interaction/interactionConfig.js';
import { MAGIC_CASTLE_LANDMARKS } from './magicCastleConfig.js';
import { magicCastleGroundHeightAt } from './createMagicCastleScene.js';

const stone = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true, ...options });

function add(group, name, geometry, material, position, scale = null, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function buildCastle(group) {
  const walls = stone('#77718e');
  const trim = stone('#aaa3c6');
  const roof = stone('#34375e', { emissive: '#171a46', emissiveIntensity: 0.28 });
  const crystal = stone('#64d8f2', { emissive: '#16749a', emissiveIntensity: 0.75, metalness: 0.12 });
  add(group, 'MagicCastleGreatHall', new THREE.BoxGeometry(6.2, 4.2, 4.3), walls, [0, 2.12, 0]);
  add(group, 'MagicCastleGatehouse', new THREE.BoxGeometry(2.8, 3.2, 0.72), trim, [0, 1.62, 2.08]);
  add(group, 'MagicCastleGateShadow', new THREE.BoxGeometry(1.15, 2.05, 0.78), stone('#151529'), [0, 1.03, 2.48]);
  add(group, 'MagicCastleUpperKeep', new THREE.BoxGeometry(3.4, 2.15, 3.15), trim, [0, 5.15, -0.2]);
  for (const [index, x, z, height] of [[1, -3.15, -2.05, 6.5], [2, 3.15, -2.05, 6.5], [3, -3.15, 2.05, 5.4], [4, 3.15, 2.05, 5.4], [5, 0, -0.2, 8.1]]) {
    const radius = index === 5 ? 0.9 : 0.68;
    add(group, `MagicCastleTower-${index}`, new THREE.CylinderGeometry(radius, radius * 1.13, height, 8), walls, [x, height / 2, z]);
    add(group, `MagicCastleTowerCrown-${index}`, new THREE.ConeGeometry(radius * 1.55, 1.8, 8), roof, [x, height + 0.75, z]);
    add(group, `MagicCastleTowerSpire-${index}`, new THREE.ConeGeometry(0.12, 1.2, 6), crystal, [x, height + 2.1, z]);
  }
  for (const x of [-1.65, 1.65]) {
    add(group, `MagicCastleWindow-${x}`, new THREE.BoxGeometry(0.42, 0.9, 0.08), stone('#8feaff', { emissive: '#3cbadd', emissiveIntensity: 1.1 }), [x, 5.1, 1.43]);
    add(group, `MagicCastleWindowArch-${x}`, new THREE.ConeGeometry(0.3, 0.42, 4), roof, [x, 5.76, 1.43], null, [0, Math.PI / 4, 0]);
  }
  add(group, 'MagicCastleDoorRune', new THREE.OctahedronGeometry(0.34, 0), crystal, [0, 2.8, 2.5]);
  group.add(new THREE.PointLight('#78dfff', 1.1, 12).translateY(4.6));
}

function buildWizardTower(group) {
  const masonry = stone('#605d7c');
  const roof = stone('#5a347a', { emissive: '#30134e', emissiveIntensity: 0.36 });
  add(group, 'WizardTowerFoundation', new THREE.CylinderGeometry(2.05, 2.35, 0.6, 12), stone('#393750'), [0, 0.3, 0]);
  add(group, 'WizardTowerShaft', new THREE.CylinderGeometry(1.35, 1.7, 6.2, 12), masonry, [0, 3.4, 0]);
  add(group, 'WizardTowerUpperGallery', new THREE.CylinderGeometry(1.85, 1.55, 0.55, 12), stone('#8980a9'), [0, 6.35, 0]);
  add(group, 'WizardTowerRoof', new THREE.ConeGeometry(2.05, 3.4, 12), roof, [0, 8.25, 0]);
  add(group, 'WizardTowerOrb', new THREE.SphereGeometry(0.42, 12, 8), stone('#d18cff', { emissive: '#9229d0', emissiveIntensity: 1.15 }), [0, 10.18, 0]);
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    const x = Math.cos(angle) * 1.35;
    const z = Math.sin(angle) * 1.35;
    add(group, `WizardTowerWindow-${index + 1}`, new THREE.BoxGeometry(0.28, 0.95, 0.08), stone('#bd8cff', { emissive: '#7039ad', emissiveIntensity: 0.9 }), [x, 4.2, z], null, [0, -angle, 0]);
  }
  const astrolabe = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.075, 8, 32), stone('#9de7ff', { emissive: '#367aa4', emissiveIntensity: 0.8, metalness: 0.35 }));
  astrolabe.name = 'WizardTowerAstrolabe';
  astrolabe.position.y = 8.25;
  astrolabe.rotation.x = Math.PI / 2.7;
  group.add(astrolabe);
  group.add(new THREE.PointLight('#be84ff', 1.2, 9).translateY(7.7));
}

function buildGarden(group) {
  add(group, 'EnchantedGardenBoundary', new THREE.TorusGeometry(3.1, 0.22, 8, 28), stone('#637456'), [0, 0.18, 0], null, [Math.PI / 2, 0, 0]);
  add(group, 'EnchantedGardenFountainBasin', new THREE.CylinderGeometry(1.25, 1.5, 0.42, 12), stone('#77718e'), [0, 0.23, 0]);
  add(group, 'EnchantedGardenWater', new THREE.CylinderGeometry(1.08, 1.08, 0.08, 16), stone('#59c8d3', { emissive: '#156b83', emissiveIntensity: 0.55, metalness: 0.22, roughness: 0.3 }), [0, 0.48, 0]);
  add(group, 'EnchantedGardenFountainStem', new THREE.CylinderGeometry(0.16, 0.25, 1.15, 8), stone('#aaa3c6'), [0, 0.99, 0]);
  add(group, 'EnchantedGardenFountainOrb', new THREE.IcosahedronGeometry(0.38, 1), stone('#a8efff', { emissive: '#49b6e3', emissiveIntensity: 1 }), [0, 1.68, 0]);
  const archMaterial = stone('#718367');
  for (const x of [-2.65, 2.65]) add(group, `EnchantedGardenArchPost-${x}`, new THREE.CylinderGeometry(0.16, 0.2, 3.2, 7), archMaterial, [x, 1.6, -1.5]);
  add(group, 'EnchantedGardenArch', new THREE.TorusGeometry(2.65, 0.17, 7, 20, Math.PI), archMaterial, [0, 2.9, -1.5], null, [0, 0, Math.PI]);
  for (let index = 0; index < 9; index += 1) {
    const angle = index * (Math.PI * 2 / 9);
    const x = Math.cos(angle) * 2.35;
    const z = Math.sin(angle) * 2.35;
    const blossom = stone(['#f58bd4', '#8ee6fa', '#c7a1ff'][index % 3], { emissive: ['#60244c', '#20596d', '#533879'][index % 3], emissiveIntensity: 0.5 });
    add(group, `EnchantedGardenFlower-${index + 1}`, new THREE.SphereGeometry(0.28, 8, 6), blossom, [x, 0.55 + (index % 2) * 0.13, z], [1, 0.72, 1]);
    add(group, `EnchantedGardenStem-${index + 1}`, new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5), archMaterial, [x, 0.27, z]);
  }
  group.add(new THREE.PointLight('#81dce8', 0.85, 7).translateY(1.2));
}

const builders = Object.freeze({
  'magic-castle': buildCastle,
  'wizard-tower': buildWizardTower,
  'enchanted-garden': buildGarden,
});

export function createMagicCastleLandmarks(scene, groundHeightAt = magicCastleGroundHeightAt, definitions = MAGIC_CASTLE_LANDMARKS) {
  return definitions.map((definition) => {
    const builder = builders[definition.id];
    if (!builder) throw new Error(`Unknown Magic Castle landmark: ${definition.id}`);
    const object3D = new THREE.Group();
    object3D.name = `MagicCastleLandmark-${definition.id}`;
    object3D.position.set(definition.position.x, groundHeightAt(definition.position.x, definition.position.z), definition.position.z);
    builder(object3D);
    scene.add(object3D);
    return { ...definition, title: definition.name, interactionDistance: INTERACTION_DISTANCE, object3D };
  });
}
