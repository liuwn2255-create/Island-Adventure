import * as THREE from 'three';

function createMaterials() {
  return {
    mushroomStem: new THREE.MeshStandardMaterial({ color: '#e3d7b5', roughness: 0.82, flatShading: true }),
    mushroomCap: new THREE.MeshStandardMaterial({ color: '#bd5a3d', emissive: '#6b2416', emissiveIntensity: 0.18, roughness: 0.48, flatShading: true }),
    mushroomSpot: new THREE.MeshStandardMaterial({ color: '#f5dfac', roughness: 0.7, flatShading: true }),
    seed: new THREE.MeshStandardMaterial({ color: '#805735', roughness: 0.9, flatShading: true }),
    seedSeam: new THREE.MeshStandardMaterial({ color: '#d1a46b', roughness: 0.86, flatShading: true }),
    seedGrain: new THREE.MeshStandardMaterial({ color: '#a47a4c', roughness: 0.88, flatShading: true }),
    sprout: new THREE.MeshStandardMaterial({ color: '#6f9d55', roughness: 0.82, flatShading: true }),
    butterflyWing: new THREE.MeshStandardMaterial({ color: '#e8a34f', roughness: 0.55, side: THREE.DoubleSide, flatShading: true }),
    butterflyWingLight: new THREE.MeshStandardMaterial({ color: '#d7e58d', roughness: 0.55, side: THREE.DoubleSide, flatShading: true }),
    butterflyBody: new THREE.MeshStandardMaterial({ color: '#46382c', roughness: 0.84, flatShading: true }),
    butterflyMark: new THREE.MeshStandardMaterial({ color: '#704b8a', roughness: 0.55, flatShading: true }),
    feather: new THREE.MeshStandardMaterial({ color: '#63834e', roughness: 0.76, flatShading: true }),
    featherTip: new THREE.MeshStandardMaterial({ color: '#b6c78a', roughness: 0.76, flatShading: true }),
    leaf: new THREE.MeshStandardMaterial({ color: '#78b968', emissive: '#22551d', emissiveIntensity: 0.2, roughness: 0.62, side: THREE.DoubleSide, flatShading: true }),
    leafVein: new THREE.MeshStandardMaterial({ color: '#d8efa1', emissive: '#6d9b43', emissiveIntensity: 0.16, roughness: 0.54, flatShading: true }),
  };
}

function addMesh(group, name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addMagicMushroom(group, index) {
  const materials = createMaterials();
  const stem = addMesh(group, 'magic-mushroom-stem', new THREE.CylinderGeometry(0.09, 0.14, 0.34, 7), materials.mushroomStem);
  stem.position.y = 0.19;
  stem.rotation.z = (index % 2 ? -1 : 1) * 0.08;

  const cap = addMesh(group, 'magic-mushroom-cap', new THREE.SphereGeometry(0.31, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), materials.mushroomCap);
  cap.position.y = 0.34;
  cap.scale.set(1.12, 0.82, 1.12);

  const spotGeometry = new THREE.SphereGeometry(0.035, 5, 4);
  for (const [spotIndex, position] of [[-0.13, 0.53, 0.08], [0.1, 0.55, -0.11], [0.2, 0.48, 0.1]].entries()) {
    const spot = addMesh(group, `magic-mushroom-spot-${spotIndex + 1}`, spotGeometry, materials.mushroomSpot);
    spot.position.set(...position);
  }
}

function addAncientSeed(group, index) {
  const materials = createMaterials();
  const seed = addMesh(group, 'ancient-seed-body', new THREE.SphereGeometry(0.29, 9, 6), materials.seed);
  seed.position.y = 0.31;
  seed.scale.set(0.82, 1.12 + (index % 2) * 0.08, 0.72);
  seed.rotation.set(0.16, index * 0.41, 0.1);

  const seam = addMesh(group, 'ancient-seed-seam', new THREE.CylinderGeometry(0.012, 0.016, 0.42, 5), materials.seedSeam);
  seam.position.set(0, 0.32, 0.205);

  for (const [grainIndex, x] of [-0.11, 0.11].entries()) {
    const grainPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 0.018, 0.12, 0.195),
      new THREE.Vector3(x, 0.28, 0.218),
      new THREE.Vector3(x + 0.014, 0.47, 0.194),
    ]);
    addMesh(group, `ancient-seed-wood-grain-${grainIndex + 1}`, new THREE.TubeGeometry(grainPath, 6, 0.008, 4, false), materials.seedGrain);
  }

  const sprout = addMesh(group, 'ancient-seed-sprout', new THREE.ConeGeometry(0.09, 0.2, 5), materials.sprout);
  sprout.position.set(0, 0.61, 0);
  sprout.rotation.z = 0.16;
}

function addButterflySpecimen(group) {
  const materials = createMaterials();
  const upperLeft = addMesh(group, 'butterfly-upper-left-wing', new THREE.SphereGeometry(0.19, 7, 4), materials.butterflyWing);
  upperLeft.position.set(-0.15, 0.55, 0);
  upperLeft.scale.set(1.05, 1.12, 0.22);
  upperLeft.rotation.z = 0.2;

  const upperRight = addMesh(group, 'butterfly-upper-right-wing', new THREE.SphereGeometry(0.19, 7, 4), materials.butterflyWing);
  upperRight.position.set(0.15, 0.55, 0);
  upperRight.scale.set(1.05, 1.12, 0.22);
  upperRight.rotation.z = -0.2;

  for (const side of [-1, 1]) {
    const lower = addMesh(group, `butterfly-lower-wing-${side}`, new THREE.SphereGeometry(0.135, 6, 4), materials.butterflyWingLight);
    lower.position.set(side * 0.12, 0.34, 0.015);
    lower.scale.set(1, 1.05, 0.2);
    const mark = addMesh(group, `butterfly-wing-mark-${side}`, new THREE.SphereGeometry(0.038, 5, 4), materials.butterflyMark);
    mark.position.set(side * 0.21, 0.55, 0.045);
  }

  const body = addMesh(group, 'butterfly-body', new THREE.CylinderGeometry(0.025, 0.04, 0.38, 5), materials.butterflyBody);
  body.position.y = 0.45;
  const antenna = new THREE.CylinderGeometry(0.008, 0.012, 0.15, 4);
  for (const side of [-1, 1]) {
    const feeler = addMesh(group, `butterfly-antenna-${side}`, antenna, materials.butterflyBody);
    feeler.position.set(side * 0.045, 0.68, 0);
    feeler.rotation.z = side * -0.38;
  }
}

function addForestFeather(group, index) {
  const materials = createMaterials();
  const shaft = addMesh(group, 'forest-feather-shaft', new THREE.CylinderGeometry(0.014, 0.023, 0.78, 5), materials.featherTip);
  shaft.position.y = 0.42;
  shaft.rotation.z = (index % 2 ? -1 : 1) * 0.14;

  const vane = new THREE.ConeGeometry(0.06, 0.2, 4);
  for (let row = 0; row < 5; row += 1) {
    const y = 0.17 + row * 0.105;
    for (const side of [-1, 1]) {
      const barb = addMesh(group, `forest-feather-barb-${row}-${side}`, vane, row % 2 ? materials.feather : materials.featherTip);
      barb.position.set(side * (0.055 + row * 0.009), y, 0);
      barb.rotation.z = side * (Math.PI / 2.8);
      barb.scale.set(0.8 + row * 0.05, 1, 0.55);
    }
  }
}

function addFairyLeaf(group, index) {
  const materials = createMaterials();
  const outline = new THREE.Shape();
  outline.moveTo(0, -0.36);
  outline.bezierCurveTo(-0.28, -0.16, -0.3, 0.19, 0, 0.4);
  outline.bezierCurveTo(0.3, 0.19, 0.28, -0.16, 0, -0.36);
  const leaf = addMesh(group, 'fairy-leaf-blade', new THREE.ShapeGeometry(outline, 6), materials.leaf);
  leaf.position.y = 0.48;
  leaf.rotation.z = (index % 2 ? -1 : 1) * 0.14;

  const veinPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.33, 0.012),
    new THREE.Vector3(0.018, -0.08, 0.012),
    new THREE.Vector3(-0.008, 0.16, 0.012),
    new THREE.Vector3(0, 0.36, 0.012),
  ]);
  addMesh(group, 'fairy-leaf-central-vein', new THREE.TubeGeometry(veinPath, 8, 0.012, 4, false), materials.leafVein).position.y = 0.48;

  for (const side of [-1, 1]) {
    for (const [row, startY, endX] of [[1, -0.16, 0.12], [2, 0, 0.19], [3, 0.16, 0.12]]) {
      const sideVeinPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, startY, 0.014),
        new THREE.Vector3(side * endX * 0.48, startY + 0.025, 0.014),
        new THREE.Vector3(side * endX, startY + 0.075, 0.014),
      ]);
      const sideVein = addMesh(group, `fairy-leaf-side-vein-${row}-${side}`, new THREE.TubeGeometry(sideVeinPath, 5, 0.007, 4, false), materials.leafVein);
      sideVein.position.y = 0.48;
    }
  }
}

export const FOREST_COLLECTIBLE_VISUAL_BUILDERS = Object.freeze({
  'forest-magic-mushroom': addMagicMushroom,
  'forest-ancient-seed': addAncientSeed,
  'forest-butterfly-specimen': addButterflySpecimen,
  'forest-forest-feather': addForestFeather,
  'forest-fairy-leaf': addFairyLeaf,
});
