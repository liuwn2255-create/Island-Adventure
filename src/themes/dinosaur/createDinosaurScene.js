import * as THREE from 'three';

const GROUND_SIZE = 30;

export function dinosaurGroundHeightAt(_x, _z) {
  return 0;
}

function addRockFormation(scene, x, z, scale, index) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({
      color: index % 2 === 0 ? '#79513a' : '#936445',
      roughness: 0.98,
      flatShading: true,
    }),
  );
  rock.name = `DinosaurRockFormation-${index + 1}`;
  rock.position.set(x, scale.y * 0.38, z);
  rock.scale.copy(scale);
  rock.rotation.set(index * 0.07, index * 0.53, index * -0.04);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  return rock;
}

function addFern(scene, x, z, size, index) {
  const group = new THREE.Group();
  group.name = `DinosaurFern-${index + 1}`;
  group.position.set(x, dinosaurGroundHeightAt(x, z), z);

  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#5a5635', roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: index % 2 === 0 ? '#557a3d' : '#718848',
    roughness: 0.93,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, size * 0.68, 6), stemMaterial);
  stem.position.y = size * 0.34;
  stem.castShadow = true;
  group.add(stem);

  for (let frond = 0; frond < 5; frond += 1) {
    const angle = (frond / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(size * 0.19, size * 0.82, 5), leafMaterial);
    leaf.position.set(Math.cos(angle) * size * 0.22, size * 0.72, Math.sin(angle) * size * 0.22);
    leaf.rotation.z = -0.58;
    leaf.rotation.y = -angle;
    leaf.castShadow = true;
    group.add(leaf);
  }

  scene.add(group);
  return group;
}

function disposeSceneResources(scene) {
  const geometries = new Set();
  const materials = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

/** Builds a standalone, flat-ground Dinosaur World scene for a future runtime. */
export function createDinosaurScene() {
  const scene = new THREE.Scene();
  scene.name = 'DinosaurValleyScene';
  scene.background = new THREE.Color('#c9b68d');
  scene.fog = new THREE.Fog('#c9b68d', 28, 58);

  scene.add(new THREE.HemisphereLight('#e8f2ec', '#59402f', 1.7));
  const sunlight = new THREE.DirectionalLight('#ffe0ac', 2.1);
  sunlight.position.set(-9, 16, 8);
  sunlight.castShadow = true;
  scene.add(sunlight);
  scene.add(new THREE.AmbientLight('#a9b596', 0.32));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: '#b29a68', roughness: 1, side: THREE.DoubleSide }),
  );
  ground.name = 'DinosaurValleyGround';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = dinosaurGroundHeightAt(0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  [
    [-12, -8, 2.3, 4.0, 2.0], [-13, 0, 2.8, 5.2, 2.2], [-11, 9, 2.1, 3.6, 2.0],
    [11, -9, 2.5, 4.3, 2.2], [13, -1, 2.0, 5.0, 2.0], [11, 9, 2.6, 4.1, 2.4],
    [-4, -13, 2.8, 3.3, 2.0], [5, 13, 2.4, 3.8, 2.0],
  ].forEach(([x, z, sx, sy, sz], index) => {
    addRockFormation(scene, x, z, new THREE.Vector3(sx, sy, sz), index);
  });

  [
    [-7, -4, 1.25], [-5, 5, 1.0], [6, -5, 1.15], [8, 4, 1.35],
  ].forEach(([x, z, size], index) => addFern(scene, x, z, size, index));

  return {
    scene,
    ground,
    groundHeightAt: dinosaurGroundHeightAt,
    cameraTarget: new THREE.Vector3(0, 1, 0),
    dispose() {
      disposeSceneResources(scene);
    },
  };
}
