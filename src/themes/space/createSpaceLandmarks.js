import * as THREE from 'three';
import { INTERACTION_DISTANCE } from '../../interaction/interactionConfig.js';
import { SPACE_LANDMARKS } from './spaceConfig.js';

const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.74, flatShading: true, ...options });

function buildStation(group) {
  const hull = mat('#a8b7c8', { metalness: 0.45 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.82, 2.4, 10), hull);
  core.name = 'SpaceStationCore';
  core.rotation.z = Math.PI / 2;
  core.castShadow = true;
  group.add(core);
  for (const side of [-1, 1]) {
    const module = new THREE.Mesh(new THREE.SphereGeometry(0.76, 10, 8), mat('#7188a6', { metalness: 0.36 }));
    module.name = `SpaceStationModule-${side}`;
    module.position.x = side * 1.7;
    module.scale.set(1.15, 0.9, 0.9);
    group.add(module);
  }
  const solar = mat('#3388c5', { emissive: '#12385e', emissiveIntensity: 0.3, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.25), solar);
    panel.name = `SpaceStationSolarPanel-${side}`;
    panel.position.set(side * 0.25, 0.3, side * 2.0);
    group.add(panel);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), hull);
    beam.position.set(0, 0.25, side * 1.3);
    group.add(beam);
  }
  group.add(new THREE.PointLight('#73cfff', 0.8, 5));
}

function buildAlienPlanet(group) {
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 12), mat('#8c68b8', { emissive: '#271342', emissiveIntensity: 0.24 }));
  planet.name = 'AlienPlanetGlobe';
  planet.position.y = 1.55;
  planet.castShadow = true;
  group.add(planet);
  const band = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 7, 24), mat('#5dd1c8', { emissive: '#164b51', emissiveIntensity: 0.35 }));
  band.name = 'AlienPlanetRing';
  band.position.y = 1.52;
  band.rotation.x = Math.PI / 2.8;
  group.add(band);
  for (let index = 0; index < 5; index += 1) {
    const moonlet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 + (index % 2) * 0.08, 0), mat('#b98cdd'));
    const angle = (index / 5) * Math.PI * 2;
    moonlet.name = `AlienPlanetMoonlet-${index + 1}`;
    moonlet.position.set(Math.cos(angle) * 2.35, 1.5 + Math.sin(angle) * 0.5, Math.sin(angle) * 2.35);
    group.add(moonlet);
  }
  group.add(new THREE.PointLight('#b183ed', 1.0, 6).translateY(1.4));
}

function buildObservatory(group) {
  const metal = mat('#aab7c4', { metalness: 0.42 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.55, 10), mat('#4b586d'));
  base.name = 'SpaceObservatoryBase';
  base.position.y = 0.28;
  group.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#63788f'));
  dome.name = 'SpaceObservatoryDome';
  dome.position.y = 0.52;
  group.add(dome);
  const telescope = new THREE.Group();
  telescope.name = 'SpaceObservatoryTelescope';
  telescope.position.set(0, 1.0, 0);
  telescope.rotation.z = -0.38;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.8, 10), metal);
  tube.rotation.z = Math.PI / 2;
  tube.castShadow = true;
  telescope.add(tube);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), mat('#6be0ef', { emissive: '#187080', emissiveIntensity: 0.65, side: THREE.DoubleSide }));
  lens.position.x = 0.92;
  lens.rotation.y = Math.PI / 2;
  telescope.add(lens);
  group.add(telescope);
  const tripod = mat('#77889a', { metalness: 0.28 });
  for (let index = 0; index < 3; index += 1) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.2, 6), tripod);
    leg.position.set(Math.cos(index * 2.1) * 0.42, 0.45, Math.sin(index * 2.1) * 0.42);
    leg.rotation.z = (index - 1) * 0.24;
    group.add(leg);
  }
}

const builders = Object.freeze({
  'space-station': buildStation,
  'alien-planet': buildAlienPlanet,
  'space-observatory': buildObservatory,
});

export function createSpaceLandmarks(scene, groundHeightAt, definitions = SPACE_LANDMARKS) {
  return definitions.map((definition) => {
    const build = builders[definition.id];
    if (!build) throw new Error(`Unknown Space landmark: ${definition.id}`);
    const object3D = new THREE.Group();
    object3D.name = `SpaceLandmark-${definition.id}`;
    object3D.position.set(definition.position.x, groundHeightAt(definition.position.x, definition.position.z), definition.position.z);
    build(object3D);
    scene.add(object3D);
    return { ...definition, title: definition.name, interactionDistance: INTERACTION_DISTANCE, object3D };
  });
}
