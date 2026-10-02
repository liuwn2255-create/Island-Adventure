import * as THREE from 'three';
import { ISLAND_WALKABLE_RADIUS } from '../config/gameConfig.js';

export const OCEAN_LEVEL = 0.6;
export const ISLAND_COAST_RADIUS = ISLAND_WALKABLE_RADIUS + 1.65;
const RADIAL_SEGMENTS = 112;
const RADIAL_RINGS = 28;

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function coastRadius(angle) {
  return ISLAND_COAST_RADIUS * (
    1
    + 0.038 * Math.sin(angle * 3 + 0.45)
    + 0.023 * Math.cos(angle * 5 - 0.7)
    + 0.012 * Math.sin(angle * 9 + 0.2)
  );
}

const hillPeaks = [
  { x: -2.8, z: 3.0, height: 2.0, spread: 3.0 },
  { x: 4.6, z: -2.6, height: 1.55, spread: 2.8 },
  { x: -5.8, z: -3.2, height: 1.1, spread: 2.5 },
];

export function getTerrainHeight(x, z) {
  const distance = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const normalizedRadius = THREE.MathUtils.clamp(distance / coastRadius(angle), 0, 1);
  const centralRise = 0.9 + 0.72 * (1 - smoothstep(0.18, 0.98, normalizedRadius));
  const ridges = hillPeaks.reduce((sum, hill) => {
    const dx = x - hill.x;
    const dz = z - hill.z;
    return sum + hill.height * Math.exp(-(dx * dx + dz * dz) / (hill.spread * hill.spread));
  }, 0);
  const softVariation = 0.08 * Math.sin(x * 0.55) * Math.cos(z * 0.48) * (1 - normalizedRadius);
  return centralRise + ridges + softVariation;
}

function terrainColor(normalizedRadius, height) {
  const grass = new THREE.Color('#77b75d');
  const highGrass = new THREE.Color('#589755');
  const sand = new THREE.Color('#c9b27b');
  const color = grass.clone().lerp(highGrass, THREE.MathUtils.clamp((height - 1.15) * 0.13, 0, 0.48));
  return color.lerp(sand, smoothstep(0.79, 0.985, normalizedRadius));
}

export function createTerrain(scene) {
  const positions = [0, getTerrainHeight(0, 0), 0];
  const colors = [];
  const centerColor = terrainColor(0, getTerrainHeight(0, 0));
  colors.push(centerColor.r, centerColor.g, centerColor.b);

  for (let ring = 1; ring <= RADIAL_RINGS; ring += 1) {
    const t = ring / RADIAL_RINGS;
    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const angle = (segment / RADIAL_SEGMENTS) * Math.PI * 2;
      const radius = coastRadius(angle) * t;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = getTerrainHeight(x, z);
      const color = terrainColor(t, height);
      positions.push(x, height, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  const indices = [];
  for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
    const next = (segment + 1) % RADIAL_SEGMENTS;
    const a = 1 + segment;
    const b = 1 + next;
    indices.push(0, b, a);
  }
  for (let ring = 0; ring < RADIAL_RINGS - 1; ring += 1) {
    const innerStart = 1 + ring * RADIAL_SEGMENTS;
    const outerStart = innerStart + RADIAL_SEGMENTS;
    for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
      const next = (segment + 1) % RADIAL_SEGMENTS;
      const a = innerStart + segment;
      const b = innerStart + next;
      const c = outerStart + segment;
      const d = outerStart + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  topGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  topGeometry.setIndex(indices);
  topGeometry.computeVertexNormals();
  const top = new THREE.Mesh(
    topGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }),
  );
  top.name = 'IslandGrassyTerrain';
  top.receiveShadow = true;
  top.castShadow = true;
  scene.add(top);

  const sidePositions = [];
  const sideColors = [];
  const sideIndices = [];
  const bottomY = OCEAN_LEVEL - 0.72;
  for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
    const angle = (segment / RADIAL_SEGMENTS) * Math.PI * 2;
    const radius = coastRadius(angle);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const topY = getTerrainHeight(x, z);
    const sideColor = new THREE.Color(segment % 5 === 0 ? '#846044' : '#98704c');
    sidePositions.push(x, topY, z, x, bottomY, z);
    sideColors.push(sideColor.r, sideColor.g, sideColor.b, sideColor.r, sideColor.g, sideColor.b);
  }
  for (let segment = 0; segment < RADIAL_SEGMENTS; segment += 1) {
    const next = (segment + 1) % RADIAL_SEGMENTS;
    const a = segment * 2;
    const b = next * 2;
    const c = a + 1;
    const d = b + 1;
    sideIndices.push(a, b, c, b, d, c);
  }
  const sideGeometry = new THREE.BufferGeometry();
  sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
  sideGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sideColors, 3));
  sideGeometry.setIndex(sideIndices);
  sideGeometry.computeVertexNormals();
  const side = new THREE.Mesh(
    sideGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  );
  side.name = 'IslandEarthCoast';
  side.receiveShadow = true;
  scene.add(side);

  return { heightAt: getTerrainHeight };
}

