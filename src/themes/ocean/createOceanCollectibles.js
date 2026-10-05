import * as THREE from 'three';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES } from './oceanConfig.js';

const materials = {
  scale: new THREE.MeshStandardMaterial({ color: '#55cad4', emissive: '#11626e', emissiveIntensity: 0.28, metalness: 0.42, roughness: 0.3, flatShading: true }),
  scaleLight: new THREE.MeshStandardMaterial({ color: '#b3f3db', metalness: 0.35, roughness: 0.25, flatShading: true }),
  coral: new THREE.MeshStandardMaterial({ color: '#f27665', roughness: 0.48, flatShading: true }),
  coralLight: new THREE.MeshStandardMaterial({ color: '#ffb079', roughness: 0.5, flatShading: true }),
  gem: new THREE.MeshStandardMaterial({ color: '#34d7e8', emissive: '#087aab', emissiveIntensity: 0.5, metalness: 0.32, roughness: 0.2, flatShading: true }),
  gemLight: new THREE.MeshStandardMaterial({ color: '#c9ffff', emissive: '#3bc7df', emissiveIntensity: 0.35, metalness: 0.24, roughness: 0.18, flatShading: true }),
};

function addFishScale(group, name, x, y, rotation = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.36);
  shape.quadraticCurveTo(0.38, 0.25, 0.34, -0.04);
  shape.quadraticCurveTo(0.23, -0.35, 0, -0.49);
  shape.quadraticCurveTo(-0.23, -0.35, -0.34, -0.04);
  shape.quadraticCurveTo(-0.38, 0.25, 0, 0.36);
  const scale = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }), materials.scale);
  scale.name = name;
  scale.rotation.y = Math.PI + rotation;
  scale.position.set(x, y, -0.08);
  scale.scale.set(0.92, 0.92, 0.92);
  scale.castShadow = true;
  group.add(scale);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 5, 12, Math.PI), materials.scaleLight);
  ridge.name = `${name}-ridge`;
  ridge.position.set(x, y + 0.02, -0.13);
  group.add(ridge);
}

function addScaleCluster(group) {
  group.name = 'OceanMysteriousFishScales';
  // Five overlapping upright plates make a readable scale cluster from the
  // normal third-person approach angle, instead of lying nearly edge-on on sand.
  [[0, 1.18, 0], [-0.27, 0.91, -0.12], [0.27, 0.91, 0.12], [-0.14, 0.62, 0.1], [0.14, 0.62, -0.1]]
    .forEach(([x, y, rotation], index) => addFishScale(group, `OceanFishScale-${index + 1}`, x, y, rotation));
}

function addCoralSegment(group, name, start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.68, radius, direction.length(), 7), material);
  branch.name = name;
  branch.position.copy(from.add(to).multiplyScalar(0.5));
  branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  branch.castShadow = true;
  group.add(branch);
}

function addBranchingCoral(group) {
  group.name = 'OceanBranchingCoralCollectible';
  addCoralSegment(group, 'OceanCoralTrunk', [0, 0.06, 0], [0, 0.78, 0], 0.19, materials.coral);
  addCoralSegment(group, 'OceanCoralLeftFork', [0, 0.48, 0], [-0.42, 0.98, 0.02], 0.12, materials.coralLight);
  addCoralSegment(group, 'OceanCoralRightFork', [0, 0.57, 0], [0.43, 1.0, -0.02], 0.13, materials.coral);
  addCoralSegment(group, 'OceanCoralCenterFork', [0, 0.62, 0], [0.02, 1.18, 0.04], 0.1, materials.coralLight);
  addCoralSegment(group, 'OceanCoralLeftTwig', [-0.29, 0.82, 0.01], [-0.53, 1.12, 0.06], 0.075, materials.coral);
  addCoralSegment(group, 'OceanCoralRightTwig', [0.29, 0.84, -0.01], [0.57, 1.14, -0.06], 0.075, materials.coralLight);
  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#715d68', roughness: 0.95, flatShading: true }));
  base.name = 'OceanCoralRockBase';
  base.position.set(0, 0.16, 0);
  base.scale.set(1.25, 0.7, 1);
  group.add(base);
}

function addFacetedGem(group) {
  group.name = 'OceanDeepFacetedGem';
  const plinth = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), new THREE.MeshStandardMaterial({ color: '#435967', roughness: 0.82, flatShading: true }));
  plinth.name = 'OceanGemDisplayStone';
  plinth.position.y = 0.2;
  plinth.scale.set(1.18, 0.38, 1.18);
  plinth.receiveShadow = true;
  group.add(plinth);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 24), materials.gemLight);
  halo.name = 'OceanGemTreasureHalo';
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.39;
  group.add(halo);
  const girdle = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.16, 8, 1, false), materials.gem);
  girdle.name = 'OceanGemGirdle';
  girdle.position.y = 0.73;
  girdle.castShadow = true;
  group.add(girdle);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.39, 0.36, 8, 1, false), materials.gemLight);
  crown.name = 'OceanGemCrownFacets';
  crown.position.y = 0.99;
  crown.castShadow = true;
  group.add(crown);
  const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.39, 0.43, 8, 1, false), materials.gem);
  pavilion.name = 'OceanGemPavilionFacets';
  pavilion.position.y = 0.435;
  pavilion.rotation.y = Math.PI / 8;
  pavilion.castShadow = true;
  group.add(pavilion);
  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), materials.gemLight);
  glint.name = 'OceanGemHighlight';
  glint.position.set(-0.12, 1.1, 0.1);
  group.add(glint);
}

const visualTypeById = Object.freeze({
  'ocean-coral': 'ocean-branching-coral',
  'ocean-deep-gem': 'ocean-faceted-gem',
  'ocean-mysterious-scale': 'ocean-fish-scales',
});

const builders = Object.freeze({
  'ocean-branching-coral': addBranchingCoral,
  'ocean-faceted-gem': addFacetedGem,
  'ocean-fish-scales': addScaleCluster,
});

/** Uses Ocean-only visuals while preserving the shared collectible types and spawn IDs. */
export function createOceanCollectibles(scene, groundHeightAt, spawns = OCEAN_COLLECTIBLES, types = OCEAN_COLLECTIBLE_TYPES) {
  const oceanTypes = types.map((type) => ({ ...type, visualType: visualTypeById[type.id] ?? type.visualType }));
  return createCollectibleItems(scene, groundHeightAt, spawns, oceanTypes, builders);
}
