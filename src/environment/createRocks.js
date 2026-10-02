import * as THREE from 'three';

const ROCK_SPOTS = [
  [-8.3, -6.2, 0.56], [-9.0, 1.6, 0.72], [-7.2, 6.4, 0.42], [-4.8, 8.1, 0.58],
  [4.1, 8.2, 0.45], [8.3, 6.0, 0.76], [9.4, 2.3, 0.5], [9.1, -3.3, 0.68],
  [6.6, -7.2, 0.4], [1.7, -9.0, 0.64], [-4.3, -8.4, 0.48], [-8.6, -3.3, 0.38],
];

export function createRocks(scene, heightAt) {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#8c9891', roughness: 1, flatShading: true });
  const rocks = new THREE.InstancedMesh(geometry, material, ROCK_SPOTS.length);
  rocks.name = 'InstancedCoastalRocks';
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const transform = new THREE.Object3D();
  const colors = ['#8f9d96', '#a6aaa0', '#777f79', '#b6aa93'];

  ROCK_SPOTS.forEach(([x, z, size], i) => {
    const sx = size * (0.78 + (i % 3) * 0.12);
    const sy = size * (0.63 + (i % 2) * 0.22);
    const sz = size * (0.82 + ((i + 1) % 3) * 0.1);
    transform.position.set(x, heightAt(x, z) + sy * 0.42, z);
    transform.rotation.set(0.12 * (i % 3), (i * 1.31) % (Math.PI * 2), 0.1 * ((i + 1) % 4));
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
    rocks.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  });
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  scene.add(rocks);
  return rocks;
}
