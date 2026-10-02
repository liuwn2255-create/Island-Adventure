import * as THREE from 'three';
import { OCEAN_LEVEL } from './createTerrain.js';

export function createOcean(scene) {
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshPhysicalMaterial({
      color: '#46b7d4',
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.32,
      clearcoatRoughness: 0.38,
      transparent: true,
      opacity: 0.94,
    }),
  );
  ocean.name = 'IslandOcean';
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = OCEAN_LEVEL;
  ocean.receiveShadow = true;
  scene.add(ocean);
  return ocean;
}
