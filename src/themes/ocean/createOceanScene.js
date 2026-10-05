import * as THREE from 'three';
import { OCEAN_LANDMARKS } from './oceanConfig.js';
import { createOceanLandmarks } from './createOceanLandmarks.js';

const FLOOR_HALF_SIZE = 10.8;
const TERRAIN_SEGMENTS = 64;

export function oceanGroundHeightAt(x, z) {
  const rollingSand = 0.11 * Math.sin(x * 0.52) * Math.cos(z * 0.43)
    + 0.055 * Math.sin((x + z) * 0.9)
    + 0.035 * Math.cos(x * 1.15 - z * 0.7);
  const reefShelf = 0.16 * Math.exp(-((x ** 2) / 11 + ((z - 6) ** 2) / 7));
  const caveDepth = 0.62 * Math.exp(-(((x + 5) ** 2) / 8 + ((z + 4) ** 2) / 6));
  const wreckTrench = 0.19 * Math.exp(-((z - (-0.34 * x + 1.7)) ** 2) / 1.15) * Math.exp(-((x - 0.1) ** 2) / 65);
  const scatteredRidges = 0.18 * Math.exp(-(((x - 7) ** 2) / 3 + ((z - 6) ** 2) / 4))
    + 0.13 * Math.exp(-(((x + 7) ** 2) / 5 + ((z - 1) ** 2) / 3));
  return -1.15 + rollingSand + reefShelf - caveDepth - wreckTrench + scatteredRidges;
}

function seabedColorAt(x, z, height) {
  const depth = THREE.MathUtils.clamp((-height - 0.9) / 1.0, 0, 1);
  const distance = Math.hypot(x, z);
  const edge = THREE.MathUtils.clamp((distance - 7.4) / 3.4, 0, 1);
  return new THREE.Color('#b9a578')
    .lerp(new THREE.Color('#687f84'), depth * 0.72)
    .lerp(new THREE.Color('#263d53'), edge * 0.72);
}

function createSeabed(scene) {
  const positions = [];
  const colors = [];
  const indices = [];
  const steps = TERRAIN_SEGMENTS + 1;
  for (let row = 0; row < steps; row += 1) {
    const z = -FLOOR_HALF_SIZE + (row / TERRAIN_SEGMENTS) * FLOOR_HALF_SIZE * 2;
    for (let column = 0; column < steps; column += 1) {
      const x = -FLOOR_HALF_SIZE + (column / TERRAIN_SEGMENTS) * FLOOR_HALF_SIZE * 2;
      const y = oceanGroundHeightAt(x, z);
      positions.push(x, y, z);
      const color = seabedColorAt(x, z, y);
      colors.push(color.r, color.g, color.b);
      if (row < TERRAIN_SEGMENTS && column < TERRAIN_SEGMENTS) {
        const a = row * steps + column;
        const b = a + 1;
        const c = a + steps;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const sand = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, side: THREE.DoubleSide }));
  sand.name = 'OceanUndulatingSeabed';
  sand.receiveShadow = true;
  scene.add(sand);

  const silt = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: '#061a30', side: THREE.BackSide, transparent: true, opacity: 0.18 }));
  silt.name = 'OceanDeepWaterFalloff';
  silt.rotation.x = -Math.PI / 2;
  silt.position.y = -3.4;
  scene.add(silt);
}

function addBackdrop(scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#17364c', roughness: 1, flatShading: true });
  for (let index = 0; index < 22; index += 1) {
    const angle = (index / 22) * Math.PI * 2;
    const radius = 11.4 + (index % 4) * 0.45;
    const height = 3.6 + (index % 5) * 0.72;
    const rock = new THREE.Mesh(
      index % 3 === 0 ? new THREE.IcosahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 0),
      wallMaterial,
    );
    rock.name = `OceanDistantRidge-${index + 1}`;
    rock.position.set(Math.cos(angle) * radius, oceanGroundHeightAt(Math.cos(angle) * 9.6, Math.sin(angle) * 9.6) + height * 0.38, Math.sin(angle) * radius);
    rock.scale.set(1.1 + (index % 3) * 0.3, height, 1.0 + (index % 2) * 0.4);
    rock.rotation.y = angle;
    rock.castShadow = true;
    scene.add(rock);
  }
}

function addRockClusters(scene) {
  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#637781', roughness: 0.98, flatShading: true });
  const rocks = [
    [-8.3, -1.8, 0.62, 1.0], [-7.6, -2.5, 0.38, 0.72], [8.1, -3.5, 0.55, 1.25],
    [7.3, -4.0, 0.32, 0.66], [-7.3, 7.8, 0.46, 0.83], [8.2, 7.0, 0.68, 1.12],
    [-1.2, -8.7, 0.45, 0.7], [2.0, -8.5, 0.58, 0.9],
  ];
  rocks.forEach(([x, z, radius, scale], index) => {
    const geometry = index % 2 ? new THREE.IcosahedronGeometry(radius, 0) : new THREE.DodecahedronGeometry(radius, 0);
    const rock = new THREE.Mesh(geometry, rockMaterial);
    rock.name = `OceanOutcrop-${index + 1}`;
    rock.position.set(x, oceanGroundHeightAt(x, z) + radius * 0.48, z);
    rock.scale.set(scale, 0.72 + (index % 3) * 0.18, 0.9 + (index % 2) * 0.26);
    rock.rotation.set(index * 0.07, index * 0.62, index * -0.08);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });
}

function addSeaweedPatch(scene, x, z, index) {
  const group = new THREE.Group();
  group.name = `OceanSeaweedPatch-${index + 1}`;
  group.position.set(x, oceanGroundHeightAt(x, z), z);
  group.rotation.y = index * 0.41;
  const colors = ['#287c78', '#359888', '#57aa8d'];
  const blades = 3 + (index % 4);
  for (let bladeIndex = 0; bladeIndex < blades; bladeIndex += 1) {
    const height = 0.72 + ((index + bladeIndex * 3) % 6) * 0.2;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.1 + (bladeIndex % 2) * 0.04, height, 5), new THREE.MeshStandardMaterial({ color: colors[(index + bladeIndex) % colors.length], roughness: 0.82, flatShading: true }));
    blade.name = `OceanSeaweedBlade-${index + 1}-${bladeIndex + 1}`;
    blade.position.set(Math.sin(bladeIndex * 2.3) * 0.17, height / 2, Math.cos(bladeIndex * 1.7) * 0.12);
    blade.rotation.z = Math.sin(index + bladeIndex) * 0.2;
    blade.castShadow = true;
    group.add(blade);
  }
  scene.add(group);
}

function addLightRays(scene) {
  const rayMaterial = new THREE.MeshBasicMaterial({ color: '#58c7e7', transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide });
  for (let index = 0; index < 4; index += 1) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(1.0 + index * 0.28, 9.5, 18, 1, true), rayMaterial);
    ray.name = `OceanLightRay-${index + 1}`;
    ray.position.set(-5.8 + index * 3.8, 4.4, -2.5 + (index % 2) * 5.1);
    ray.rotation.z = -0.08 + index * 0.035;
    scene.add(ray);
  }
}

function addAmbientBubbles(scene) {
  const bubbleMaterial = new THREE.MeshBasicMaterial({ color: '#bdefff', transparent: true, opacity: 0.32, depthWrite: false });
  const clusters = [
    [-7.2, 0.0, 4.6], [7.0, -0.5, 4.1], [-2.5, -1.0, -7.1], [7.8, 0.4, 5.0],
  ];
  clusters.forEach(([x, y, z], clusterIndex) => {
    const group = new THREE.Group();
    group.name = `OceanAmbientBubbles-${clusterIndex + 1}`;
    group.position.set(x, y, z);
    for (let index = 0; index < 4; index += 1) {
      const radius = 0.055 + ((index + clusterIndex) % 3) * 0.027;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), bubbleMaterial);
      bubble.name = `OceanAmbientBubble-${clusterIndex + 1}-${index + 1}`;
      bubble.position.set(Math.sin(index * 1.9) * 0.12, index * 0.31, Math.cos(index * 1.1) * 0.1);
      const baseY = bubble.position.y;
      const phase = index * 0.43 + clusterIndex * 0.7;
      bubble.onBeforeRender = () => {
        bubble.position.y = baseY + ((Date.now() * 0.00012 + phase) % 1) * 0.4;
      };
      group.add(bubble);
    }
    scene.add(group);
  });
}

export function createOceanScene() {
  const scene = new THREE.Scene();
  scene.name = 'DeepOceanExplorationScene';
  scene.background = new THREE.Color('#071c34');
  scene.fog = new THREE.FogExp2('#0b2b49', 0.027);
  scene.add(new THREE.HemisphereLight('#90dff1', '#102e4a', 1.75));
  const downlight = new THREE.DirectionalLight('#a7e9fa', 1.55);
  downlight.position.set(-4, 12, 3);
  downlight.castShadow = true;
  scene.add(downlight);
  scene.add(new THREE.AmbientLight('#2275a2', 0.52));

  createSeabed(scene);
  addBackdrop(scene);
  addRockClusters(scene);
  [
    [-8.1, -5.2], [-7.9, 3.8], [-6.5, 6.7], [-3.7, -8.1], [3.4, -8.0],
    [7.8, 3.0], [8.0, -6.1], [4.0, 8.0], [-2.7, 8.4],
  ].forEach(([x, z], index) => addSeaweedPatch(scene, x, z, index));
  addLightRays(scene);
  addAmbientBubbles(scene);
  const landmarks = createOceanLandmarks(scene, oceanGroundHeightAt, OCEAN_LANDMARKS);

  return {
    scene,
    cameraTarget: new THREE.Vector3(0, oceanGroundHeightAt(0, 0) + 1.25, 0),
    groundHeightAt: oceanGroundHeightAt,
    landmarks,
  };
}
