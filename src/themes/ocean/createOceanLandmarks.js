import * as THREE from 'three';
import { INTERACTION_DISTANCE } from '../../interaction/interactionConfig.js';
import { OCEAN_LANDMARKS } from './oceanConfig.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, flatShading: true, ...options });
}

const coralMaterials = [
  material('#f28b79', { roughness: 0.66 }),
  material('#edbd70', { roughness: 0.68 }),
  material('#b58be0', { roughness: 0.62 }),
  material('#5fc3b7', { roughness: 0.7 }),
];
const rockMaterial = material('#536a77', { roughness: 0.98 });
const seaweedMaterials = [material('#3f9d86'), material('#4bb3a0'), material('#277c79')];
const bubbleMaterial = new THREE.MeshBasicMaterial({ color: '#c6f5ff', transparent: true, opacity: 0.55, depthWrite: false });

function addRock(group, name, position, scale, index = 0) {
  const geometry = index % 2 === 0
    ? new THREE.DodecahedronGeometry(1, 0)
    : new THREE.IcosahedronGeometry(1, 0);
  const rock = new THREE.Mesh(geometry, rockMaterial);
  rock.name = name;
  rock.position.set(...position);
  rock.scale.set(...scale);
  rock.rotation.set(index * 0.13, index * 0.51, index * -0.09);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);
  return rock;
}

function addCoralBranch(group, name, position, height, colorIndex, variant) {
  const coral = new THREE.Group();
  coral.name = `OceanCoral-${name}`;
  coral.position.set(...position);
  coral.rotation.y = variant * 0.73;
  const materialForCoral = coralMaterials[colorIndex % coralMaterials.length];
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.19, height * 0.68, 7), materialForCoral);
  stem.name = `OceanCoralStem-${name}`;
  stem.position.y = height * 0.34;
  stem.castShadow = true;
  coral.add(stem);

  const branchCount = 3 + (variant % 2);
  for (let branch = 0; branch < branchCount; branch += 1) {
    const side = branch % 2 === 0 ? -1 : 1;
    const branchHeight = height * (0.3 + (branch % 3) * 0.06);
    const branchMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045 + (branch % 2) * 0.015, 0.09, branchHeight, 6),
      coralMaterials[(colorIndex + branch + 1) % coralMaterials.length],
    );
    branchMesh.name = `OceanCoralBranch-${name}-${branch + 1}`;
    branchMesh.position.set(side * (0.18 + branch * 0.06), height * (0.49 + branch * 0.095), (branch % 2) * 0.11);
    branchMesh.rotation.z = side * (0.42 + (branch % 2) * 0.16);
    branchMesh.rotation.x = (branch - 1) * 0.13;
    branchMesh.castShadow = true;
    coral.add(branchMesh);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.13 + variant * 0.012, 7, 5), materialForCoral);
  crown.name = `OceanCoralCrown-${name}`;
  crown.position.set(0, height * 0.69, 0);
  coral.add(crown);
  group.add(coral);
  return coral;
}

function addTubeCoral(group, name, position, height, colorIndex) {
  const coral = new THREE.Group();
  coral.name = `OceanCoralTube-${name}`;
  coral.position.set(...position);
  const tubeCount = 3 + (colorIndex % 3);
  for (let index = 0; index < tubeCount; index += 1) {
    const tubeHeight = height * (0.56 + ((index * 7) % tubeCount) / tubeCount * 0.42);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075 + (index % 2) * 0.025, 0.13, tubeHeight, 8),
      coralMaterials[(colorIndex + index) % coralMaterials.length],
    );
    tube.name = `OceanCoralTubeStem-${name}-${index + 1}`;
    tube.position.set(Math.cos(index * 2.1) * 0.2, tubeHeight / 2, Math.sin(index * 2.1) * 0.2);
    tube.castShadow = true;
    coral.add(tube);
    const opening = new THREE.Mesh(new THREE.TorusGeometry(0.075 + (index % 2) * 0.025, 0.018, 5, 9), material('#553d75'));
    opening.name = `OceanCoralTubeOpening-${name}-${index + 1}`;
    opening.position.copy(tube.position).add(new THREE.Vector3(0, tubeHeight / 2 + 0.012, 0));
    opening.rotation.x = Math.PI / 2;
    coral.add(opening);
  }
  group.add(coral);
  return coral;
}

function addFanCoral(group, name, position, scale, colorIndex) {
  const fan = new THREE.Group();
  fan.name = `OceanCoralFan-${name}`;
  fan.position.set(...position);
  const materialForCoral = coralMaterials[colorIndex % coralMaterials.length];
  const fanGeometry = new THREE.SphereGeometry(0.55, 9, 7);
  const fanMesh = new THREE.Mesh(fanGeometry, materialForCoral);
  fanMesh.name = `OceanCoralFanBlade-${name}`;
  fanMesh.scale.set(0.18, scale, 0.88);
  fanMesh.position.y = scale * 0.65;
  fanMesh.castShadow = true;
  fan.add(fanMesh);
  for (let index = 0; index < 5; index += 1) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, scale * (0.75 + (index % 2) * 0.16), 5), coralMaterials[(colorIndex + 1) % coralMaterials.length]);
    rib.name = `OceanCoralFanRib-${name}-${index + 1}`;
    rib.position.set((index - 2) * 0.13, scale * 0.52, 0.16);
    rib.rotation.z = (index - 2) * -0.12;
    fan.add(rib);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.55, 6), material('#547b76'));
  base.name = `OceanCoralFanBase-${name}`;
  base.position.y = 0.27;
  fan.add(base);
  group.add(fan);
  return fan;
}

function addSeaweed(group, name, position, height, variant = 0) {
  const grass = new THREE.Group();
  grass.name = `OceanSeaweed-${name}`;
  grass.position.set(...position);
  grass.rotation.y = variant * 0.47;
  const blades = 3 + (variant % 3);
  for (let index = 0; index < blades; index += 1) {
    const bladeHeight = height * (0.66 + ((index + variant) % 4) * 0.1);
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.095 + (index % 2) * 0.035, bladeHeight, 5),
      seaweedMaterials[(index + variant) % seaweedMaterials.length],
    );
    blade.name = `OceanSeaweedBlade-${name}-${index + 1}`;
    blade.position.set(Math.sin(index * 2.4) * 0.16, bladeHeight / 2, Math.cos(index * 2.4) * 0.13);
    blade.rotation.z = Math.sin(index + variant) * 0.16;
    blade.castShadow = true;
    grass.add(blade);
  }
  group.add(grass);
  return grass;
}

function addBubbles(group, name, position, count = 4, scale = 1) {
  const bubbleGroup = new THREE.Group();
  bubbleGroup.name = `OceanBubbles-${name}`;
  bubbleGroup.position.set(...position);
  for (let index = 0; index < count; index += 1) {
    const radius = scale * (0.055 + (index % 3) * 0.022);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), bubbleMaterial);
    bubble.name = `OceanBubble-${name}-${index + 1}`;
    bubble.position.set(Math.sin(index * 1.8) * 0.14, index * 0.38, Math.cos(index * 1.3) * 0.1);
    bubble.userData.riseBaseY = bubble.position.y;
    bubble.userData.risePhase = index * 0.73;
    bubble.onBeforeRender = () => {
      const cycle = (Date.now() * 0.00016 + bubble.userData.risePhase) % 1;
      bubble.position.y = bubble.userData.riseBaseY + cycle * 0.52;
    };
    bubbleGroup.add(bubble);
  }
  group.add(bubbleGroup);
  return bubbleGroup;
}

function addReef(group) {
  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 1), material('#586f79'));
  base.name = 'OceanReefFoundation';
  base.position.set(0, 0.2, 0);
  base.scale.set(1.75, 0.58, 1.25);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  addCoralBranch(group, 'reef-branch-tall', [-0.75, 0.42, 0.1], 2.4, 0, 2);
  addCoralBranch(group, 'reef-branch-split', [0.58, 0.35, -0.35], 1.7, 2, 1);
  addTubeCoral(group, 'reef-tubes', [0.15, 0.34, 0.78], 1.4, 1);
  addFanCoral(group, 'reef-fan', [1.22, 0.3, 0.1], 1.55, 3);
  addFanCoral(group, 'reef-fan-small', [-1.28, 0.22, -0.4], 0.95, 2);
  for (const [index, entry] of [[-1.7, -0.3, 0.33], [1.7, 0.55, 0.42], [-0.2, -1.1, 0.25], [0.45, 1.1, 0.29]].entries()) {
    addRock(group, `OceanReefRock-${index + 1}`, [entry[0], entry[2] * 0.2, entry[1]], [entry[2] * 1.4, entry[2], entry[2]], index);
  }
  addSeaweed(group, 'reef-left', [-1.7, 0.25, 0.6], 1.15, 2);
  addSeaweed(group, 'reef-back', [1.65, 0.25, -0.8], 1.42, 1);
  addBubbles(group, 'reef-vent', [0.25, 0.65, 0.5], 5, 1.05);
  group.add(new THREE.PointLight('#55d8ed', 1.15, 5, 2).translateY(1.05));
}

function makeHullGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.75, 0.25);
  shape.lineTo(1.7, 0.25);
  shape.lineTo(1.35, -1.35);
  shape.lineTo(0.62, -2.0);
  shape.lineTo(-0.9, -1.9);
  shape.lineTo(-1.52, -1.25);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.92, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.09, bevelThickness: 0.1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0.14, 0.46);
  return geometry;
}

function addCrate(group, name, position, size, rotation = 0) {
  const crate = new THREE.Group();
  crate.name = `ShipCrate-${name}`;
  crate.position.set(...position);
  crate.rotation.y = rotation;
  const body = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.78, size * 0.82), material('#88684a'));
  body.name = `ShipCrateBody-${name}`;
  body.castShadow = true;
  body.receiveShadow = true;
  crate.add(body);
  for (const z of [-size * 0.42, size * 0.42]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(size * 0.92, size * 0.09, size * 0.08), material('#b18b5b'));
    slat.name = `ShipCrateSlat-${name}`;
    slat.position.z = z;
    crate.add(slat);
  }
  group.add(crate);
}

function addAnchor(group) {
  const anchor = new THREE.Group();
  anchor.name = 'ShipAnchor';
  anchor.position.set(1.8, 0.24, -1.0);
  anchor.rotation.z = -0.2;
  const iron = material('#46545a', { metalness: 0.42, roughness: 0.68 });
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 1.6, 7), iron);
  shank.name = 'ShipAnchorShank';
  shank.position.y = 0.65;
  anchor.add(shank);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 7, 12), iron);
  ring.name = 'ShipAnchorRing';
  ring.position.y = 1.52;
  anchor.add(ring);
  const arms = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.075, 7, 14, Math.PI), iron);
  arms.name = 'ShipAnchorArms';
  arms.position.y = 0.1;
  arms.rotation.z = Math.PI;
  anchor.add(arms);
  group.add(anchor);
}

function addSunkenShip(group) {
  const ship = new THREE.Group();
  ship.name = 'OceanSunkenShipStructure';
  ship.rotation.z = -0.12;
  ship.rotation.x = 0.08;
  const hull = new THREE.Mesh(makeHullGeometry(), material('#75563d', { roughness: 0.98 }));
  hull.name = 'ShipHull';
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);

  const plankMaterial = material('#a17a4f');
  for (let index = 0; index < 7; index += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.45 - Math.abs(index - 3) * 0.12), plankMaterial);
    plank.name = `ShipDeckPlank-${index + 1}`;
    plank.position.set(-0.72 + index * 0.24, 0.48, -0.45);
    plank.rotation.y = (index - 3) * 0.025;
    plank.castShadow = true;
    ship.add(plank);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 3.7, 8), material('#73563f'));
  mast.name = 'ShipMast';
  mast.position.set(0, 2.25, -0.55);
  mast.rotation.z = -0.13;
  mast.castShadow = true;
  ship.add(mast);
  const crossbeam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 2.5, 7), plankMaterial);
  crossbeam.name = 'ShipSailYard';
  crossbeam.position.set(0, 2.55, -0.55);
  crossbeam.rotation.z = Math.PI / 2;
  ship.add(crossbeam);

  const sailMaterial = material('#c9b892', { side: THREE.DoubleSide, roughness: 1 });
  const tornSailA = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2, 2, 2), sailMaterial);
  tornSailA.name = 'ShipTornSailUpper';
  tornSailA.position.set(0.33, 2.02, -0.49);
  tornSailA.rotation.y = -0.1;
  tornSailA.rotation.z = -0.08;
  ship.add(tornSailA);
  const tornSailB = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.74, 1, 1), material('#8e8068', { side: THREE.DoubleSide, roughness: 1 }));
  tornSailB.name = 'ShipTornSailLower';
  tornSailB.position.set(-0.42, 1.42, -0.5);
  tornSailB.rotation.z = 0.18;
  ship.add(tornSailB);
  for (const [index, pos] of [[-1.1, 0.48, -0.45], [1.1, 0.38, -0.55], [-1.35, 0.18, -0.25]].entries()) {
    addRock(ship, `ShipDebris-${index + 1}`, pos, [0.38 + index * 0.1, 0.24, 0.48], index);
  }
  addSeaweed(ship, 'wreck-hull', [-1.0, 0.34, -1.15], 1.15, 0);
  addSeaweed(ship, 'wreck-stern', [1.0, 0.32, -1.45], 0.9, 2);
  addCrate(ship, 'deck-a', [-0.75, 0.62, -0.25], 0.62, 0.2);
  addCrate(ship, 'deck-b', [0.93, 0.52, -0.8], 0.48, -0.34);
  addAnchor(ship);
  addBubbles(ship, 'shipwreck', [-0.1, 0.72, -1.1], 4, 0.85);
  group.add(ship);
}

function addCave(group) {
  const cave = new THREE.Group();
  cave.name = 'OceanDeepCaveStructure';
  const cliffMaterials = [material('#1c3447', { roughness: 0.99 }), material('#263f52', { roughness: 0.96 }), material('#304b5b', { roughness: 0.95 })];
  const rocks = [
    ['CaveLeftWall', [-1.45, 1.2, 0], [0.95, 1.75, 1.35]],
    ['CaveRightWall', [1.42, 1.0, -0.08], [0.9, 1.55, 1.25]],
    ['CaveLintelLeft', [-0.78, 2.35, 0.02], [0.95, 0.7, 1.15]],
    ['CaveLintelRight', [0.68, 2.25, -0.04], [1.0, 0.78, 1.2]],
    ['CaveBackWall', [0, 1.15, -1.05], [1.4, 1.45, 0.62]],
  ];
  rocks.forEach(([name, position, scale], index) => {
    const rock = new THREE.Mesh(index % 2 ? new THREE.IcosahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 1), cliffMaterials[index % cliffMaterials.length]);
    rock.name = name;
    rock.position.set(...position);
    rock.scale.set(...scale);
    rock.rotation.set(index * 0.09, index * 0.23, index * -0.08);
    rock.castShadow = true;
    rock.receiveShadow = true;
    cave.add(rock);
  });
  const entrance = new THREE.Mesh(new THREE.CircleGeometry(0.92, 16), new THREE.MeshBasicMaterial({ color: '#06101f', side: THREE.DoubleSide }));
  entrance.name = 'CaveDarkEntrance';
  entrance.position.set(0, 1.03, -0.68);
  cave.add(entrance);

  const crystalMaterial = new THREE.MeshStandardMaterial({ color: '#68d5ed', emissive: '#168cda', emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.08, flatShading: true });
  for (const [index, entry] of [[-1.25, 0.0, 0.85, 0.7], [-0.95, 0.06, 0.52, 0.42], [1.1, -0.02, 1.04, 0.82], [0.96, 0.14, 1.4, 0.44]].entries()) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(entry[3], 0), crystalMaterial);
    crystal.name = `CaveGlowCrystal-${index + 1}`;
    crystal.position.set(entry[0], entry[2], entry[1]);
    crystal.scale.set(0.7, 1.5 + index * 0.12, 0.7);
    crystal.rotation.z = (index - 1) * 0.2;
    cave.add(crystal);
  }
  cave.add(new THREE.PointLight('#28b9f0', 1.5, 5, 2).translateY(1.4));
  addSeaweed(cave, 'cave-mouth-left', [-1.9, 0.12, 0.72], 1.35, 1);
  addSeaweed(cave, 'cave-mouth-right', [1.8, 0.12, 0.75], 1.05, 2);
  addBubbles(cave, 'cave-vent', [0.25, 0.3, 0.9], 3, 0.8);
  group.add(cave);
}

const landmarkBuilders = Object.freeze({
  'ocean-reef': addReef,
  'ocean-sunken-ship': addSunkenShip,
  'ocean-deep-cave': addCave,
});

export function createOceanLandmarks(scene, groundHeightAt, definitions = OCEAN_LANDMARKS) {
  return definitions.map((definition) => {
    const builder = landmarkBuilders[definition.id];
    if (!builder) throw new Error(`未知的海洋地標：${definition.id}`);

    const object3D = new THREE.Group();
    object3D.name = `OceanLandmark-${definition.id}`;
    object3D.position.set(
      definition.position.x,
      groundHeightAt(definition.position.x, definition.position.z),
      definition.position.z,
    );
    builder(object3D);
    scene.add(object3D);

    return {
      ...definition,
      title: definition.name,
      interactionDistance: INTERACTION_DISTANCE,
      object3D,
    };
  });
}
