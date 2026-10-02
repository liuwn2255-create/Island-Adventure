import * as THREE from 'three';

const TREE_SPOTS = [
  [-8.4, -5.1, 0.95], [-9.0, -0.6, 1.12], [-7.9, 4.7, 0.9], [-4.3, 8.2, 0.92],
  [1.2, 9.4, 1.06], [6.1, 8.1, 0.96], [9.1, 4.3, 1.08], [9.4, -0.7, 0.91],
  [8.5, -5.2, 1.08], [4.1, -9.0, 0.94], [-1.0, -9.1, 1.12], [-6.3, -7.0, 0.9],
  [-9.2, 2.7, 0.83], [6.8, 3.6, 0.86],
];

const TREE_COLORS = ['#4c9660', '#5da969', '#70b36a', '#4b8958', '#81bd72'];
const FLOWER_COLORS = ['#f4d37a', '#f29f9c', '#f4f0d5', '#b7a5dc'];

function setInstance(mesh, index, position, rotationY, scale, color) {
  const transform = new THREE.Object3D();
  transform.position.copy(position);
  transform.rotation.y = rotationY;
  transform.scale.set(scale.x, scale.y, scale.z);
  transform.updateMatrix();
  mesh.setMatrixAt(index, transform.matrix);
  if (color) mesh.setColorAt(index, color);
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function distanceToCurve(x, z, curve, samples = 70) {
  let minDistance = Infinity;
  for (let i = 0; i <= samples; i += 1) {
    const point = curve.getPointAt(i / samples);
    minDistance = Math.min(minDistance, Math.hypot(x - point.x, z - point.z));
  }
  return minDistance;
}

export function createVegetation(scene, heightAt, pathCurve) {
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.19, 1, 7, 1);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#81583d', roughness: 1, flatShading: true });
  const lowerCanopyGeometry = new THREE.ConeGeometry(1, 1, 7, 1);
  const upperCanopyGeometry = new THREE.ConeGeometry(1, 1, 7, 1);
  const canopyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.94, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, TREE_SPOTS.length);
  const lowerCanopies = new THREE.InstancedMesh(lowerCanopyGeometry, canopyMaterial, TREE_SPOTS.length);
  const upperCanopies = new THREE.InstancedMesh(upperCanopyGeometry, canopyMaterial, TREE_SPOTS.length);
  trunks.name = 'InstancedTreeTrunks';
  lowerCanopies.name = 'InstancedTreeCrowns';
  upperCanopies.name = 'InstancedTreeCrowns';
  trunks.castShadow = lowerCanopies.castShadow = upperCanopies.castShadow = true;
  trunks.receiveShadow = lowerCanopies.receiveShadow = upperCanopies.receiveShadow = true;

  TREE_SPOTS.forEach(([x, z, size], i) => {
    const ground = heightAt(x, z);
    const treeHeight = (2.9 + (i % 3) * 0.28) * size;
    const trunkHeight = treeHeight * 0.43;
    const turn = (i * 1.73) % (Math.PI * 2);
    setInstance(trunks, i, new THREE.Vector3(x, ground + trunkHeight * 0.5, z), turn, new THREE.Vector3(size, trunkHeight, size));
    setInstance(lowerCanopies, i, new THREE.Vector3(x, ground + trunkHeight + treeHeight * 0.20, z), turn, new THREE.Vector3(treeHeight * 0.28, treeHeight * 0.38, treeHeight * 0.28), new THREE.Color(TREE_COLORS[i % TREE_COLORS.length]));
    setInstance(upperCanopies, i, new THREE.Vector3(x, ground + trunkHeight + treeHeight * 0.48, z), turn + 0.2, new THREE.Vector3(treeHeight * 0.21, treeHeight * 0.34, treeHeight * 0.21), new THREE.Color(TREE_COLORS[(i + 2) % TREE_COLORS.length]));
  });
  for (const mesh of [trunks, lowerCanopies, upperCanopies]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  const random = makeRandom(20260418);
  const bladeGeometry = new THREE.ConeGeometry(0.035, 0.16, 3, 1);
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#72a95c', roughness: 1, flatShading: true });
  const bladeInstances = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, 66);
  bladeInstances.name = 'InstancedGrassTufts';
  let bladeIndex = 0;
  for (let tries = 0; tries < 900 && bladeIndex < 66; tries += 1) {
    const x = (random() * 2 - 1) * 9.1;
    const z = (random() * 2 - 1) * 9.1;
    if (Math.hypot(x, z) > 9.25 || Math.hypot(x, z) < 2.4 || distanceToCurve(x, z, pathCurve) < 1.25) continue;
    const scale = 0.72 + random() * 0.7;
    setInstance(bladeInstances, bladeIndex, new THREE.Vector3(x, heightAt(x, z) + 0.07 * scale, z), random() * Math.PI, new THREE.Vector3(scale, scale, scale));
    bladeIndex += 1;
  }
  bladeInstances.count = bladeIndex;
  bladeInstances.castShadow = true;
  bladeInstances.computeBoundingSphere();
  scene.add(bladeInstances);

  const flowers = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.095, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.72, flatShading: true }),
    18,
  );
  flowers.name = 'InstancedIslandFlowers';
  let flowerIndex = 0;
  for (let tries = 0; tries < 500 && flowerIndex < 18; tries += 1) {
    const x = (random() * 2 - 1) * 8.6;
    const z = (random() * 2 - 1) * 8.6;
    if (Math.hypot(x, z) > 8.9 || Math.hypot(x, z) < 2.6 || distanceToCurve(x, z, pathCurve) < 1.45) continue;
    const nearTree = TREE_SPOTS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 1.25);
    if (nearTree) continue;
    const scale = 0.7 + random() * 0.55;
    setInstance(flowers, flowerIndex, new THREE.Vector3(x, heightAt(x, z) + 0.1, z), random() * Math.PI, new THREE.Vector3(scale, scale, scale), new THREE.Color(FLOWER_COLORS[flowerIndex % FLOWER_COLORS.length]));
    flowerIndex += 1;
  }
  flowers.count = flowerIndex;
  flowers.castShadow = true;
  flowers.computeBoundingSphere();
  scene.add(flowers);
}

