import * as THREE from 'three';
import { ITEM_SPAWNS, ITEM_TYPES } from './itemConfig.js';

const materials = {
  coin: new THREE.MeshStandardMaterial({ color: '#d9a83e', metalness: 0.58, roughness: 0.4, flatShading: true }),
  coinEdge: new THREE.MeshStandardMaterial({ color: '#795630', metalness: 0.35, roughness: 0.62, flatShading: true }),
  crystal: new THREE.MeshStandardMaterial({ color: '#a6eaf2', emissive: '#45bbd2', emissiveIntensity: 0.45, roughness: 0.28, metalness: 0.08, flatShading: true }),
  shell: new THREE.MeshStandardMaterial({ color: '#f0b9a7', roughness: 0.62, flatShading: true, side: THREE.DoubleSide }),
  stem: new THREE.MeshStandardMaterial({ color: '#568c56', roughness: 0.9, flatShading: true }),
  petal: new THREE.MeshStandardMaterial({ color: '#e980a4', roughness: 0.62, flatShading: true }),
  flowerCenter: new THREE.MeshStandardMaterial({ color: '#f5d36f', roughness: 0.58, flatShading: true }),
};

const geometry = {
  coin: new THREE.CylinderGeometry(0.25, 0.25, 0.085, 14),
  coinMark: new THREE.CylinderGeometry(0.095, 0.095, 0.012, 8),
  crystal: new THREE.OctahedronGeometry(0.32, 0),
  shell: new THREE.SphereGeometry(0.34, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  stem: new THREE.CylinderGeometry(0.035, 0.05, 0.45, 6),
  petal: new THREE.SphereGeometry(0.105, 7, 5),
  flowerCenter: new THREE.SphereGeometry(0.085, 7, 5),
};

function addCoin(group, index) {
  const coin = new THREE.Mesh(geometry.coin, materials.coin);
  coin.position.y = 0.1;
  coin.rotation.set(0.16 + index * 0.05, 0.2 * index, 0.22);
  coin.castShadow = true;
  group.add(coin);
  const mark = new THREE.Mesh(geometry.coinMark, materials.coinEdge);
  mark.position.y = 0.145;
  mark.rotation.x = -Math.PI / 2;
  group.add(mark);
}

function addCrystal(group, index) {
  const crystal = new THREE.Mesh(geometry.crystal, materials.crystal);
  crystal.position.y = 0.45;
  crystal.scale.set(0.86 + (index % 2) * 0.12, 1.35, 0.86);
  crystal.rotation.y = index * 0.7;
  crystal.castShadow = true;
  group.add(crystal);
}

function addShell(group, index) {
  const shell = new THREE.Mesh(geometry.shell, materials.shell);
  shell.position.y = 0.035;
  shell.rotation.y = index * 0.85;
  shell.scale.set(1, 0.78, 0.8);
  shell.castShadow = true;
  group.add(shell);
}

function addFlower(group, index) {
  const stem = new THREE.Mesh(geometry.stem, materials.stem);
  stem.position.y = 0.23;
  stem.rotation.z = (index % 2 ? -1 : 1) * 0.12;
  stem.castShadow = true;
  group.add(stem);
  for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
    const angle = (petalIndex / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(geometry.petal, materials.petal);
    petal.position.set(Math.cos(angle) * 0.095, 0.47, Math.sin(angle) * 0.095);
    petal.scale.set(1, 0.78, 0.72);
    petal.castShadow = true;
    group.add(petal);
  }
  const center = new THREE.Mesh(geometry.flowerCenter, materials.flowerCenter);
  center.position.y = 0.49;
  center.scale.set(0.82, 0.82, 0.82);
  group.add(center);
}

const builders = {
  'ancient-coin': addCoin,
  'mysterious-crystal': addCrystal,
  'pretty-shell': addShell,
  'special-flower': addFlower,
};

export function createCollectibleItems(scene, heightAt, spawns = ITEM_SPAWNS) {
  return spawns.map((spawn, index) => {
    const type = ITEM_TYPES.find((itemType) => itemType.id === spawn.type);
    if (!type) throw new Error(`未知的探索物品種類：${spawn.type}`);
    const groundY = heightAt(spawn.position.x, spawn.position.z);
    const object3D = new THREE.Group();
    object3D.name = `Collectible-${spawn.id}`;
    object3D.position.set(spawn.position.x, groundY, spawn.position.z);
    object3D.rotation.y = index * 0.67;
    builders[spawn.type](object3D, index);
    object3D.traverse((child) => {
      if (child.isMesh) child.receiveShadow = true;
    });
    scene.add(object3D);
    return {
      id: spawn.id,
      type: spawn.type,
      name: type.name,
      icon: type.icon,
      position: { x: spawn.position.x, y: groundY, z: spawn.position.z },
      interactionDistance: spawn.interactionDistance,
      object3D,
      collected: false,
    };
  });
}
