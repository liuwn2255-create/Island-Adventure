import * as THREE from 'three';

const GROUND_SIZE = 36;
const GROUND_HEIGHT = 0;

export function spaceGroundHeightAt(_x, _z) { return GROUND_HEIGHT; }

function addStarField(scene) {
  const starMaterial = new THREE.MeshBasicMaterial({ color: '#d8efff' });
  for (let index = 0; index < 90; index += 1) {
    const angle = index * 2.399;
    const radius = 19 + ((index * 17) % 21);
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (index % 4) * 0.012, 5, 4), starMaterial);
    star.name = `SpaceStar-${index + 1}`;
    star.position.set(Math.cos(angle) * radius, 7 + ((index * 11) % 20), Math.sin(angle) * radius);
    scene.add(star);
  }
}

function addBackdropBodies(scene) {
  const planet = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 14), new THREE.MeshStandardMaterial({ color: '#6d64bf', roughness: 0.88, flatShading: true }));
  planet.name = 'SpaceDistantPlanet';
  planet.position.set(20, 14, -31);
  scene.add(planet);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), new THREE.MeshStandardMaterial({ color: '#8a9eaf', roughness: 0.95, flatShading: true }));
  moon.name = 'SpaceDistantMoon';
  moon.position.set(-23, 10, -24);
  scene.add(moon);
}

function addAsteroids(scene) {
  const material = new THREE.MeshStandardMaterial({ color: '#49566b', roughness: 1, flatShading: true });
  [[-14, -10, 1.5], [14, -12, 2.1], [-15, 9, 1.8], [14, 12, 1.35], [0, -15, 1.1]].forEach(([x, z, size], index) => {
    const asteroid = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), material);
    asteroid.name = `SpaceAsteroid-${index + 1}`;
    asteroid.position.set(x, size * 0.48, z);
    asteroid.rotation.set(index * 0.23, index * 0.57, index * -0.16);
    asteroid.scale.set(1.2, 0.8 + (index % 2) * 0.35, 1);
    asteroid.castShadow = true;
    asteroid.receiveShadow = true;
    scene.add(asteroid);
  });
}

function disposeSceneResources(scene) {
  const geometries = new Set();
  const materials = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

/** Builds a compact, flat exploration area surrounded by a starfield. */
export function createSpaceScene() {
  const scene = new THREE.Scene();
  scene.name = 'SpaceAdventureScene';
  scene.background = new THREE.Color('#050914');
  scene.fog = new THREE.FogExp2('#080e20', 0.013);
  scene.add(new THREE.HemisphereLight('#a5c8ff', '#111729', 1.2));
  const keyLight = new THREE.DirectionalLight('#b7d8ff', 1.45);
  keyLight.position.set(-8, 16, 7);
  keyLight.castShadow = true;
  scene.add(keyLight);
  scene.add(new THREE.AmbientLight('#554c91', 0.46));

  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND_SIZE / 2, 48), new THREE.MeshStandardMaterial({ color: '#252b3d', roughness: 0.93, metalness: 0.12 }));
  ground.name = 'SpaceLandingGround';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_HEIGHT;
  ground.receiveShadow = true;
  scene.add(ground);
  const landingPad = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.18, 24), new THREE.MeshStandardMaterial({ color: '#424b65', roughness: 0.78, metalness: 0.3 }));
  landingPad.name = 'SpaceStationLandingPad';
  landingPad.position.y = 0.04;
  landingPad.receiveShadow = true;
  scene.add(landingPad);
  addStarField(scene);
  addBackdropBodies(scene);
  addAsteroids(scene);

  let disposed = false;
  return {
    scene,
    ground,
    groundHeightAt: spaceGroundHeightAt,
    cameraTarget: new THREE.Vector3(0, 1.1, 0),
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeSceneResources(scene);
    },
  };
}
