import * as THREE from 'three';
import { INTERACTION_DISTANCE } from '../../interaction/interactionConfig.js';
import { FOREST_LANDMARKS } from './forestConfig.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true, ...options });
}

function addEntrance(group) {
  const wood = material('#765038');
  const greenery = material('#477d4a');
  for (const x of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 2.3, 7), wood);
    post.position.set(x, 1.15, 0);
    post.castShadow = true;
    group.add(post);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), greenery);
    leaf.position.set(x * 1.35, 2.0, 0);
    leaf.scale.set(1.25, 0.9, 1);
    leaf.castShadow = true;
    group.add(leaf);
  }
  const lintel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.25, 7), wood);
  lintel.position.set(0, 2.27, 0);
  lintel.rotation.z = Math.PI / 2;
  lintel.castShadow = true;
  group.add(lintel);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 0.12), material('#b68a50'));
  sign.position.set(0, 1.75, 0.12);
  sign.castShadow = true;
  group.add(sign);
}

function addStreamCrossing(group) {
  const wood = material('#8a6240');
  const stone = material('#8b9380');
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 1.35), wood);
  deck.position.y = 0.23;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);
  for (let index = -2; index <= 2; index += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 1.3), material('#c09a67'));
    plank.position.set(index * 0.36, 0.32, 0);
    group.add(plank);
  }
  for (const x of [-0.95, 0.95]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.55, 6), wood);
    rail.position.set(x, 0.62, 0);
    rail.rotation.x = Math.PI / 2;
    rail.castShadow = true;
    group.add(rail);
  }
  for (const [x, z, scale] of [[-1.35, -0.35, 0.36], [1.28, 0.38, 0.42], [-1.42, 0.45, 0.28], [1.4, -0.35, 0.3]]) {
    const bankStone = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), stone);
    bankStone.position.set(x, scale * 0.28, z);
    bankStone.scale.set(1.35, 0.72, 1);
    bankStone.castShadow = true;
    group.add(bankStone);
  }
}

function addMysteriousRock(group) {
  const rockMaterial = material('#747966');
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 1), rockMaterial);
  rock.position.set(0, 1.0, 0);
  rock.scale.set(1.2, 1.0, 0.9);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);
  const runeMaterial = new THREE.MeshStandardMaterial({
    color: '#a9d28a', emissive: '#548849', emissiveIntensity: 0.3, roughness: 0.58,
  });
  for (const [y, width, rotation] of [[1.35, 0.52, 0.12], [1.05, 0.68, -0.18], [0.77, 0.42, 0.08]]) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, 0.035), runeMaterial);
    rune.position.set(0, y, 1.02);
    rune.rotation.z = rotation;
    group.add(rune);
  }
  const glow = new THREE.PointLight('#a6d77c', 0.42, 3.2, 2);
  glow.position.set(0, 1.5, 0.8);
  group.add(glow);
}

const landmarkBuilders = Object.freeze({
  'forest-entrance': addEntrance,
  'forest-stream': addStreamCrossing,
  'forest-mysterious-rock': addMysteriousRock,
});

export function createForestLandmarks(scene, groundHeightAt, definitions = FOREST_LANDMARKS) {
  return definitions.map((definition) => {
    const builder = landmarkBuilders[definition.id];
    if (!builder) throw new Error(`未知的森林地標：${definition.id}`);

    const object3D = new THREE.Group();
    object3D.name = `ForestLandmark-${definition.id}`;
    object3D.position.set(
      definition.position.x,
      groundHeightAt(definition.position.x, definition.position.z),
      definition.position.z,
    );
    builder(object3D);
    scene.add(object3D);

    return {
      ...definition,
      title: definition.name,
      interactionDistance: INTERACTION_DISTANCE,
      object3D,
    };
  });
}
