import * as THREE from 'three';
import { LANDMARK_DEFINITIONS } from '../interaction/interactableConfig.js';

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true, ...options });
}

function addCamp(group) {
  const groundPad = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.12, 12), makeMaterial('#bc9a69'));
  groundPad.position.y = 0.04;
  groundPad.receiveShadow = true;
  group.add(groundPad);

  const tent = new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.45, 4, 1), makeMaterial('#d48b55'));
  tent.position.set(0, 0.82, 0);
  tent.rotation.y = Math.PI / 4;
  tent.castShadow = true;
  tent.receiveShadow = true;
  group.add(tent);

  const doorway = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.61, 3, 1), makeMaterial('#715342'));
  doorway.position.set(0, 0.32, 0.47);
  doorway.rotation.y = Math.PI;
  group.add(doorway);

  const logMaterial = makeMaterial('#76543c');
  for (const [x, z, rotation] of [[-0.62, -0.75, 0.35], [0.62, -0.75, -0.35]]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.9, 6), logMaterial);
    log.position.set(x, 0.19, z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    log.castShadow = true;
    group.add(log);
  }
}

function addStele(group) {
  const stone = makeMaterial('#718780', { color: '#788d87' });
  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), stone);
  base.position.y = 0.24;
  base.scale.set(1.16, 0.42, 0.9);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const tablet = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), makeMaterial('#5e7975'));
  tablet.position.set(0, 1.25, 0);
  tablet.scale.set(0.58, 1.22, 0.3);
  tablet.rotation.y = 0.12;
  tablet.castShadow = true;
  tablet.receiveShadow = true;
  group.add(tablet);

  const runeMaterial = new THREE.MeshStandardMaterial({
    color: '#b8e2ce', emissive: '#538f7a', emissiveIntensity: 0.28, roughness: 0.62,
  });
  for (const [y, width, rotation] of [[1.62, 0.28, 0.25], [1.32, 0.38, -0.28], [1.04, 0.22, 0.2]]) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.035), runeMaterial);
    rune.position.set(0, y, 0.292);
    rune.rotation.z = rotation;
    group.add(rune);
  }
}

function addAncientTree(group) {
  const bark = makeMaterial('#765039');
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.82, 4.25, 9, 1), bark);
  trunk.position.y = 2.12;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (const [x, y, z, rotationZ] of [[-0.48, 2.82, 0, -0.62], [0.52, 3.05, 0.05, 0.58]]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.23, 1.85, 7), bark);
    branch.position.set(x, y, z);
    branch.rotation.z = rotationZ;
    branch.castShadow = true;
    group.add(branch);
  }

  const crownMaterial = makeMaterial('#4d9860');
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), crownMaterial);
  crown.position.y = 4.63;
  crown.scale.set(1.62, 1.32, 1.55);
  crown.castShadow = true;
  crown.receiveShadow = true;
  group.add(crown);

  for (const [x, y, z, scale] of [[-1.42, 4.35, 0.1, 0.82], [1.38, 4.46, -0.1, 0.88], [0.1, 5.55, 0.12, 0.78]]) {
    const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), crownMaterial);
    lobe.position.set(x, y, z);
    lobe.scale.set(scale * 1.1, scale, scale);
    lobe.castShadow = true;
    group.add(lobe);
  }
}

function addCrystal(group) {
  const pedestal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), makeMaterial('#738b83'));
  pedestal.position.y = 0.26;
  pedestal.scale.set(1.2, 0.44, 1.05);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: '#a2e7f3', emissive: '#39a9d1', emissiveIntensity: 0.48,
    roughness: 0.3, metalness: 0.1, clearcoat: 0.42, clearcoatRoughness: 0.28,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.73, 0), crystalMaterial);
  crystal.position.set(0, 1.42, 0);
  crystal.scale.set(0.82, 1.55, 0.82);
  crystal.rotation.y = 0.24;
  crystal.castShadow = true;
  group.add(crystal);

  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), crystalMaterial);
  shard.position.set(-0.82, 0.72, 0.25);
  shard.scale.set(0.72, 1.2, 0.72);
  shard.rotation.z = -0.24;
  shard.castShadow = true;
  group.add(shard);

  const glow = new THREE.PointLight('#79dafa', 0.72, 5.2, 2);
  glow.position.y = 1.2;
  group.add(glow);
}

const builders = {
  camp: addCamp,
  stele: addStele,
  ancientTree: addAncientTree,
  crystal: addCrystal,
};

export function createLandmarks(scene, heightAt, definitions = LANDMARK_DEFINITIONS) {
  return definitions.map((definition) => {
    const object3D = new THREE.Group();
    object3D.name = `Landmark-${definition.id}`;
    object3D.position.set(
      definition.position.x,
      heightAt(definition.position.x, definition.position.z),
      definition.position.z,
    );
    builders[definition.kind](object3D);
    scene.add(object3D);
    return { ...definition, object3D };
  });
}
