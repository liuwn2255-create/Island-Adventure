import * as THREE from 'three';

const GROUND_SIZE = 38;

export function magicCastleGroundHeightAt(_x, _z) { return 0; }

function addStoneRoad(scene) {
  const grout = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 25), new THREE.MeshStandardMaterial({ color: '#282843', roughness: 0.94 }));
  grout.name = 'MagicCastleStoneRoadBase';
  grout.rotation.x = -Math.PI / 2;
  grout.position.set(0, 0.012, 0);
  scene.add(grout);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#65617f', roughness: 0.88, flatShading: true });
  for (let index = 0; index < 18; index += 1) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 1.18), stoneMaterial);
    tile.name = `MagicCastleRoadStone-${index + 1}`;
    tile.position.set(index % 2 ? 0.86 : -0.86, 0.055, 11.5 - index * 1.35);
    tile.rotation.y = (index % 3 - 1) * 0.035;
    tile.receiveShadow = true;
    scene.add(tile);
  }
}

function addCourtyardWalls(scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#383650', roughness: 0.95, flatShading: true });
  for (const [index, x, z, width, depth] of [
    [1, 0, -17, 33, 0.7], [2, 0, 17, 33, 0.7], [3, -17, 0, 0.7, 33], [4, 17, 0, 0.7, 33],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 1.1, depth), wallMaterial);
    wall.name = `MagicCastleCourtyardWall-${index}`;
    wall.position.set(x, 0.52, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#6e648e', roughness: 0.8 });
  for (const x of [-16, 16]) for (const z of [-16, 16]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), postMaterial);
    post.name = `MagicCastleCourtyardPillar-${x}-${z}`;
    post.position.set(x, 1.05, z);
    post.castShadow = true;
    scene.add(post);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.2, 4), postMaterial);
    cap.name = `MagicCastleCourtyardPillarCap-${x}-${z}`;
    cap.position.set(x, 2.75, z);
    cap.rotation.y = Math.PI / 4;
    scene.add(cap);
  }
}

function addCrystalLights(scene) {
  const placements = [[-14, -11], [14, -11], [-14, 11], [14, 11]];
  placements.forEach(([x, z], index) => {
    const group = new THREE.Group();
    group.name = `MagicCastleCourtyardCrystal-${index + 1}`;
    group.position.set(x, 0, z);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 0.55, 8), new THREE.MeshStandardMaterial({ color: '#514765', roughness: 0.78 }));
    plinth.position.y = 0.28;
    group.add(plinth);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), new THREE.MeshStandardMaterial({ color: index % 2 ? '#d292ff' : '#6dd9ff', emissive: index % 2 ? '#652a9a' : '#155477', emissiveIntensity: 1.15, roughness: 0.24 }));
    crystal.name = `MagicCastleGlowCrystal-${index + 1}`;
    crystal.position.y = 1.18;
    crystal.scale.set(0.72, 1.45, 0.72);
    group.add(crystal);
    const light = new THREE.PointLight(index % 2 ? '#bd82ff' : '#71d8ff', 1.15, 8);
    light.position.y = 1.2;
    group.add(light);
    scene.add(group);
  });
}

function addNightSky(scene) {
  const starMaterial = new THREE.MeshBasicMaterial({ color: '#e8e0ff' });
  for (let index = 0; index < 72; index += 1) {
    const angle = index * 2.399;
    const radius = 20 + (index % 9) * 1.35;
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (index % 3) * 0.018, 5, 4), starMaterial);
    star.name = `MagicCastleNightStar-${index + 1}`;
    star.position.set(Math.cos(angle) * radius, 8 + ((index * 7) % 12), Math.sin(angle) * radius);
    scene.add(star);
  }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 12), new THREE.MeshBasicMaterial({ color: '#d3c7ff' }));
  moon.name = 'MagicCastleMoon';
  moon.position.set(-17, 16, -24);
  scene.add(moon);
  const moonGlow = new THREE.PointLight('#a99aff', 0.7, 36);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
}

function disposeSceneResources(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

/** Builds the Magic Castle courtyard with a simple, stable walking surface. */
export function createMagicCastleScene() {
  const scene = new THREE.Scene();
  scene.name = 'MagicCastleScene';
  scene.background = new THREE.Color('#100e25');
  scene.fog = new THREE.Fog('#17152d', 25, 58);
  scene.add(new THREE.HemisphereLight('#cbc5ff', '#28233f', 1.35));
  const moonlight = new THREE.DirectionalLight('#ded2ff', 1.35);
  moonlight.position.set(-7, 18, 9);
  moonlight.castShadow = true;
  scene.add(moonlight);
  scene.add(new THREE.AmbientLight('#7658a8', 0.3));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), new THREE.MeshStandardMaterial({ color: '#34314b', roughness: 0.96, side: THREE.DoubleSide }));
  ground.name = 'MagicCastleCourtyardGround';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = magicCastleGroundHeightAt(0, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  addStoneRoad(scene);
  addCourtyardWalls(scene);
  addCrystalLights(scene);
  addNightSky(scene);

  let disposed = false;
  return {
    scene,
    ground,
    groundHeightAt: magicCastleGroundHeightAt,
    cameraTarget: new THREE.Vector3(0, 1.1, 0),
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeSceneResources(scene);
    },
  };
}
