import * as THREE from 'three';
import { ANCIENT_DESERT_LANDMARKS } from './ancientDesertConfig.js';
import { ancientDesertGroundHeightAt } from './createAncientDesertScene.js';

const stone = (color = '#c8a16b') => new THREE.MeshStandardMaterial({ color, roughness: 0.94, flatShading: true });

function addMesh(group, name, geometry, material, position, scale = null, rotation = null) {
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

function createTemple(group) {
  const sandstone = stone('#c9a16b');
  const carved = stone('#a77e50');
  addMesh(group, 'AncientDesertTempleBase', new THREE.BoxGeometry(5.2, 0.42, 3.8), sandstone, [0, 0.2, 0]);
  addMesh(group, 'AncientDesertTempleBackWall', new THREE.BoxGeometry(4.5, 2.6, 0.45), sandstone, [0, 1.62, -1.3]);
  for (const side of [-1, 1]) {
    addMesh(group, `AncientDesertTempleColumn-${side}`, new THREE.CylinderGeometry(0.31, 0.4, 2.25, 8), carved, [side * 1.55, 1.35, 0.55]);
    addMesh(group, `AncientDesertTempleCapital-${side}`, new THREE.BoxGeometry(0.95, 0.28, 0.95), sandstone, [side * 1.55, 2.58, 0.55]);
  }
  addMesh(group, 'AncientDesertTempleLintel', new THREE.BoxGeometry(4.25, 0.48, 0.72), sandstone, [0, 2.78, 0.55]);
  addMesh(group, 'AncientDesertTempleInscription', new THREE.BoxGeometry(0.48, 0.66, 0.12), carved, [0, 1.64, 0.83], null, [0, 0, Math.PI / 4]);
  addMesh(group, 'AncientDesertTempleObelisk', new THREE.ConeGeometry(0.68, 2.55, 4), carved, [0, 1.45, -2.45], null, [0, Math.PI / 4, 0]);
}

function createOasis(group) {
  addMesh(group, 'AncientDesertOasisSandstoneRing', new THREE.CylinderGeometry(2.05, 2.2, 0.3, 16), stone('#b18b5b'), [0, 0.15, 0]);
  addMesh(group, 'AncientDesertOasisWater', new THREE.CylinderGeometry(1.72, 1.72, 0.12, 20), new THREE.MeshStandardMaterial({ color: '#42a9a5', roughness: 0.27, metalness: 0.12 }), [0, 0.32, 0]);
  const trunk = addMesh(group, 'AncientDesertOasisPalmTrunk', new THREE.CylinderGeometry(0.18, 0.31, 3.4, 8), stone('#795333'), [-1.1, 1.65, -0.65], null, [0, 0, -0.13]);
  trunk.material.color.set('#795333');
  const frondMaterial = new THREE.MeshStandardMaterial({ color: '#58804d', roughness: 0.92, side: THREE.DoubleSide });
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const leaf = addMesh(group, `AncientDesertOasisPalmFrond-${index + 1}`, new THREE.ConeGeometry(0.3, 2.25, 5), frondMaterial, [
      -1.1 + Math.cos(angle) * 0.82, 3.14 - (index % 2) * 0.14, -0.65 + Math.sin(angle) * 0.82,
    ], [0.65, 1, 0.3], [Math.sin(angle) * 0.62, -angle, Math.cos(angle) * -0.62]);
    leaf.castShadow = true;
  }
  for (let index = 0; index < 3; index += 1) {
    addMesh(group, `AncientDesertOasisReed-${index + 1}`, new THREE.ConeGeometry(0.15, 1.25, 5), new THREE.MeshStandardMaterial({ color: '#6b8050', roughness: 1 }), [1.3 + index * 0.35, 0.64, 0.35]);
  }
}

function createRuins(group) {
  const sandstone = stone('#b99160');
  const weathered = stone('#92714e');
  addMesh(group, 'AncientDesertRuinsGround', new THREE.BoxGeometry(5.4, 0.28, 4.2), sandstone, [0, 0.14, 0]);
  addMesh(group, 'AncientDesertRuinsLeftWall', new THREE.BoxGeometry(0.5, 2.15, 3.2), sandstone, [-2.1, 1.18, -0.15], null, [0.05, 0, -0.08]);
  addMesh(group, 'AncientDesertRuinsBrokenWall', new THREE.BoxGeometry(2.2, 1.5, 0.45), weathered, [0.1, 0.85, -1.75], null, [0, 0.05, 0.12]);
  addMesh(group, 'AncientDesertRuinsFallenBlock', new THREE.BoxGeometry(2.1, 0.42, 0.72), weathered, [1.15, 0.45, 0.8], null, [0.08, 0.35, 0.2]);
  for (const [index, x, z, height] of [[1, -0.75, 0.7, 2.6], [2, 1.6, -0.1, 1.85]]) {
    addMesh(group, `AncientDesertRuinsPillar-${index}`, new THREE.CylinderGeometry(0.28, 0.36, height, 7), sandstone, [x, height / 2 + 0.18, z]);
    addMesh(group, `AncientDesertRuinsPillarCap-${index}`, new THREE.BoxGeometry(0.78, 0.25, 0.78), weathered, [x, height + 0.3, z]);
  }
  addMesh(group, 'AncientDesertRuinsBrokenColumn', new THREE.CylinderGeometry(0.3, 0.34, 0.85, 7), weathered, [2.4, 0.55, 1.3], null, [0.1, 0, 0.45]);
}

const builders = Object.freeze({
  'ancient-desert-temple': createTemple,
  'ancient-desert-oasis': createOasis,
  'ancient-desert-ruins': createRuins,
});

export function createAncientDesertLandmarks(
  scene,
  groundHeightAt = ancientDesertGroundHeightAt,
  definitions = ANCIENT_DESERT_LANDMARKS,
) {
  return definitions.map((definition) => {
    const builder = builders[definition.id];
    if (!builder) throw new Error(`未知的古文明沙漠地標：${definition.id}`);
    const object3D = new THREE.Group();
    object3D.name = `Landmark-${definition.id}`;
    object3D.position.set(definition.position.x, groundHeightAt(definition.position.x, definition.position.z), definition.position.z);
    builder(object3D);
    scene.add(object3D);
    return {
      ...definition,
      title: definition.name,
      icon: '🏜️',
      object3D,
    };
  });
}
