import * as THREE from 'three';

const GROUND_SIZE = 36;

export function ancientDesertGroundHeightAt(_x, _z) {
  return 0;
}

function addDune(scene, x, z, sx, sy, sz, index) {
  const dune = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 10),
    new THREE.MeshStandardMaterial({
      color: index % 2 ? '#d8a454' : '#e3b769',
      roughness: 1,
      flatShading: true,
    }),
  );
  dune.name = `AncientDesertDune-${index + 1}`;
  dune.position.set(x, -sy * 0.6, z);
  dune.scale.set(sx, sy, sz);
  dune.rotation.y = index * 0.37;
  dune.receiveShadow = true;
  scene.add(dune);
}

function addRockCluster(scene, x, z, scale, index) {
  const group = new THREE.Group();
  group.name = `AncientDesertRockCluster-${index + 1}`;
  group.position.set(x, 0, z);
  for (let rockIndex = 0; rockIndex < 3; rockIndex += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        color: rockIndex % 2 ? '#9a7049' : '#795b40',
        roughness: 1,
        flatShading: true,
      }),
    );
    rock.name = `AncientDesertRock-${index + 1}-${rockIndex + 1}`;
    rock.position.set((rockIndex - 1) * scale * 0.7, scale * (0.28 + (rockIndex % 2) * 0.08), (rockIndex % 2 ? 1 : -1) * scale * 0.22);
    rock.scale.set(scale * 0.65, scale * (0.48 + (rockIndex % 2) * 0.14), scale * 0.62);
    rock.rotation.set(index * 0.13, rockIndex * 0.7, index * -0.08);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
  scene.add(group);
  return group;
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

/** Builds a standalone Ancient Desert scene with a stable, flat walking surface. */
export function createAncientDesertScene() {
  const scene = new THREE.Scene();
  scene.name = 'AncientDesertScene';
  scene.background = new THREE.Color('#e7b970');
  scene.fog = new THREE.Fog('#e7b970', 25, 58);

  scene.add(new THREE.HemisphereLight('#fff0d2', '#765338', 1.65));
  const sunlight = new THREE.DirectionalLight('#ffe0a2', 2.2);
  sunlight.position.set(-8, 17, 10);
  sunlight.castShadow = true;
  scene.add(sunlight);
  scene.add(new THREE.AmbientLight('#d8ae70', 0.28));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: '#c99650', roughness: 1, side: THREE.DoubleSide }),
  );
  ground.name = 'AncientDesertSand';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = ancientDesertGroundHeightAt(0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  [
    [-13, -8, 6.5, 1.35, 3.2], [13, -10, 6.2, 1.2, 3.8],
    [-13, 8, 5.7, 1.15, 3.2], [12, 10, 6.3, 1.45, 3.4],
  ].forEach(([x, z, sx, sy, sz], index) => addDune(scene, x, z, sx, sy, sz, index));

  [
    [-14, -2, 1.5], [14, 2, 1.4], [-10, 13, 1.2], [9, -14, 1.3],
  ].forEach(([x, z, scale], index) => addRockCluster(scene, x, z, scale, index));

  return {
    scene,
    ground,
    groundHeightAt: ancientDesertGroundHeightAt,
    cameraTarget: new THREE.Vector3(0, 1, 0),
    dispose() { disposeSceneResources(scene); },
  };
}
