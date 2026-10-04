import * as THREE from 'three';
import { FOREST_LANDMARKS } from './forestConfig.js';
import { createForestLandmarks } from './createForestLandmarks.js';

const FOREST_RADIUS = 10.7;
const TERRAIN_SEGMENTS = 96;
const TERRAIN_RINGS = 12;

export function forestGroundHeightAt(x, z) {
  return 1.01 + 0.035 * Math.sin(x * 0.42) * Math.cos(z * 0.37);
}

function createForestGround(scene) {
  const positions = [0, forestGroundHeightAt(0, 0), 0];
  const colors = [];
  const centerColor = new THREE.Color('#6f9d50');
  colors.push(centerColor.r, centerColor.g, centerColor.b);

  for (let ring = 1; ring <= TERRAIN_RINGS; ring += 1) {
    const radius = (ring / TERRAIN_RINGS) * FOREST_RADIUS;
    for (let segment = 0; segment < TERRAIN_SEGMENTS; segment += 1) {
      const angle = (segment / TERRAIN_SEGMENTS) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, forestGroundHeightAt(x, z), z);
      const color = new THREE.Color('#78a95b').lerp(
        new THREE.Color('#537d43'),
        THREE.MathUtils.clamp(radius / FOREST_RADIUS * 0.18, 0, 0.18),
      );
      colors.push(color.r, color.g, color.b);
    }
  }

  const indices = [];
  for (let segment = 0; segment < TERRAIN_SEGMENTS; segment += 1) {
    const next = (segment + 1) % TERRAIN_SEGMENTS;
    indices.push(0, 1 + next, 1 + segment);
  }
  for (let ring = 0; ring < TERRAIN_RINGS - 1; ring += 1) {
    const innerStart = 1 + ring * TERRAIN_SEGMENTS;
    const outerStart = innerStart + TERRAIN_SEGMENTS;
    for (let segment = 0; segment < TERRAIN_SEGMENTS; segment += 1) {
      const next = (segment + 1) % TERRAIN_SEGMENTS;
      const a = innerStart + segment;
      const b = innerStart + next;
      const c = outerStart + segment;
      const d = outerStart + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, side: THREE.DoubleSide }),
  );
  ground.name = 'ForestGrassGround';
  ground.receiveShadow = true;
  scene.add(ground);
}

function addTree(scene, x, z, height, variant) {
  const y = forestGroundHeightAt(x, z);
  const tree = new THREE.Group();
  tree.name = `ForestTree-${variant}`;
  tree.position.set(x, y, z);
  const bark = new THREE.MeshStandardMaterial({ color: variant % 3 === 0 ? '#694a32' : '#76543a', roughness: 0.94 });
  const leaves = [
    new THREE.MeshStandardMaterial({ color: '#39734a', roughness: 0.9, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#4b8750', roughness: 0.9, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#5b914f', roughness: 0.9, flatShading: true }),
  ][variant % 3];
  const trunkHeight = height * 0.48;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, trunkHeight, 7), bark);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const crownBase = trunkHeight * 0.56;
  for (let layer = 0; layer < 3; layer += 1) {
    const layerHeight = height * (0.42 - layer * 0.055);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(height * (0.25 - layer * 0.025), layerHeight, 7), leaves);
    crown.position.set(0, crownBase + layerHeight * (0.43 + layer * 0.55), 0);
    crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(crown);
  }
  scene.add(tree);
}

function createForestTrees(scene) {
  const trees = [
    [-8, -5, 4.8], [-7, 0, 3.7], [-8, 5, 4.5], [-5, 8, 5.2],
    [-3, -8, 4.2], [0, -8, 5.0], [3, -7, 3.6], [7, -5, 4.8],
    [8, -1, 3.7], [8, 5, 4.6], [5, 8, 5.1], [1, 8, 3.8],
    [-7, 3, 3.4], [-6, -2, 4.2], [6, -7, 3.9], [7, 7, 4.2],
    [-2, 9, 3.7], [9, 2, 4.0],
  ];
  trees.forEach(([x, z, height], index) => addTree(scene, x, z, height, index));
}

function createForestRocks(scene) {
  const material = new THREE.MeshStandardMaterial({ color: '#777c68', roughness: 1, flatShading: true });
  const rocks = [
    [-7, -1, 0.52], [-6, 6, 0.42], [7, 1, 0.48], [6, -3, 0.58],
    [-1, -7, 0.4], [2, 8, 0.46], [8, -7, 0.5],
  ];
  rocks.forEach(([x, z, scale], index) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), material);
    rock.name = `ForestRock-${index + 1}`;
    rock.position.set(x, forestGroundHeightAt(x, z) + scale * 0.35, z);
    rock.scale.set(1.35, 0.78, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });
}

function createForestStream(scene) {
  const points = [
    [-8.2, -7.8], [-7.0, -4.8], [-5.0, -1.7], [-2.5, 1.0],
    [0.4, 2.0], [3.0, 2.2], [5.5, 3.6], [7.9, 7.3],
  ].map(([x, z]) => new THREE.Vector3(x, forestGroundHeightAt(x, z) + 0.025, z));
  const curve = new THREE.CatmullRomCurve3(points);
  const samples = curve.getPoints(80);
  const positions = [];
  const indices = [];
  const halfWidth = 0.48;
  samples.forEach((point, index) => {
    const tangent = curve.getTangent(index / (samples.length - 1));
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(halfWidth);
    positions.push(
      point.x - side.x, forestGroundHeightAt(point.x - side.x, point.z - side.z) + 0.035, point.z - side.z,
      point.x + side.x, forestGroundHeightAt(point.x + side.x, point.z + side.z) + 0.035, point.z + side.z,
    );
    if (index < samples.length - 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const water = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#5baeb7', roughness: 0.28, metalness: 0.04, side: THREE.DoubleSide }),
  );
  water.name = 'ForestStream';
  water.receiveShadow = true;
  scene.add(water);
}

function createDistantForest(scene) {
  const material = new THREE.MeshStandardMaterial({ color: '#345b3f', roughness: 1, flatShading: true });
  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    const radius = 12.4 + (index % 3) * 0.45;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tree = new THREE.Mesh(new THREE.ConeGeometry(1.5 + (index % 2) * 0.35, 6 + (index % 4), 6), material);
    tree.name = `ForestBackdropTree-${index + 1}`;
    tree.position.set(x, forestGroundHeightAt(x, z) + 2.3, z);
    tree.castShadow = true;
    scene.add(tree);
  }
}

export function createForestScene() {
  const scene = new THREE.Scene();
  scene.name = 'MysteryForestScene';
  scene.background = new THREE.Color('#b5d6b0');
  scene.fog = new THREE.Fog('#b5d6b0', 24, 48);

  scene.add(new THREE.HemisphereLight(0xe7f3d9, 0x53684a, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.0);
  sun.position.set(-8, 18, 7);
  sun.castShadow = true;
  scene.add(sun);

  createForestGround(scene);
  createForestStream(scene);
  createForestTrees(scene);
  createForestRocks(scene);
  createDistantForest(scene);
  const landmarks = createForestLandmarks(scene, forestGroundHeightAt, FOREST_LANDMARKS);

  return {
    scene,
    cameraTarget: new THREE.Vector3(0, forestGroundHeightAt(0, 0) + 1, 0),
    groundHeightAt: forestGroundHeightAt,
    landmarks,
  };
}
