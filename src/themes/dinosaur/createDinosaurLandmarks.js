import * as THREE from 'three';
import { dinosaurGroundHeightAt } from './createDinosaurScene.js';
import { DINOSAUR_LANDMARKS } from './dinosaurConfig.js';

function boneMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#e4d3aa', roughness: 0.94, flatShading: true });
}

function fossilSite(group) {
  const sediment = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 0.32, 10),
    new THREE.MeshStandardMaterial({ color: '#795941', roughness: 1, flatShading: true }),
  );
  sediment.name = 'DinosaurFossilSiteFoundation';
  sediment.position.y = 0.12;
  sediment.scale.set(1.12, 1, 0.82);
  sediment.castShadow = true;
  sediment.receiveShadow = true;
  group.add(sediment);

  const bone = boneMaterial();
  const spine = new THREE.Group();
  spine.name = 'DinosaurFossilSpine';
  spine.position.set(-0.15, 0.42, 0.05);
  for (let index = 0; index < 8; index += 1) {
    const vertebra = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), bone);
    vertebra.name = `DinosaurFossilVertebra-${index + 1}`;
    vertebra.position.set(-0.95 + index * 0.27, 0, Math.sin(index * 0.62) * 0.08);
    vertebra.scale.set(1, 0.78, 1.08);
    vertebra.castShadow = true;
    spine.add(vertebra);

    if (index > 0 && index < 7) {
      for (const side of [-1, 1]) {
        const points = [
          new THREE.Vector3(0, 0.03, 0),
          new THREE.Vector3(side * 0.17, 0.11, 0.05),
          new THREE.Vector3(side * 0.36, 0.1, 0.22),
          new THREE.Vector3(side * 0.43, 0.02, 0.38),
        ];
        const ribCurve = new THREE.CatmullRomCurve3(points);
        const rib = new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 10, 0.045, 6, false), bone);
        rib.name = `DinosaurFossilRib-${index}-${side < 0 ? 'L' : 'R'}`;
        rib.position.copy(vertebra.position);
        rib.castShadow = true;
        spine.add(rib);
      }
    }
  }
  group.add(spine);

  const skull = new THREE.Group();
  skull.name = 'DinosaurFossilSkull';
  skull.position.set(1.38, 0.5, 0.04);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), bone);
  cranium.name = 'DinosaurFossilCranium';
  cranium.scale.set(1.12, 0.8, 0.92);
  cranium.castShadow = true;
  skull.add(cranium);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.62, 7), bone);
  snout.name = 'DinosaurFossilSnout';
  snout.position.set(0.36, -0.04, 0);
  snout.rotation.z = -Math.PI / 2;
  snout.castShadow = true;
  skull.add(snout);
  const eyeSocketMaterial = new THREE.MeshStandardMaterial({ color: '#49392d', roughness: 1 });
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), eyeSocketMaterial);
    socket.name = `DinosaurFossilEyeSocket-${side < 0 ? 'L' : 'R'}`;
    socket.position.set(0.02, 0.13, side * 0.27);
    skull.add(socket);
  }
  group.add(skull);
}

function volcano(group) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(2.05, 3.15, 9, 3),
    new THREE.MeshStandardMaterial({ color: '#704633', roughness: 1, flatShading: true }),
  );
  cone.name = 'DinosaurVolcanoCone';
  cone.position.y = 1.53;
  cone.castShadow = true;
  cone.receiveShadow = true;
  group.add(cone);

  const crater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.78, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: '#33251f', roughness: 1, side: THREE.DoubleSide }),
  );
  crater.name = 'DinosaurVolcanoCrater';
  crater.position.y = 2.88;
  crater.scale.set(1, 0.5, 1);
  group.add(crater);

  const lava = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 12),
    new THREE.MeshBasicMaterial({ color: '#ed7838', side: THREE.DoubleSide }),
  );
  lava.name = 'DinosaurVolcanoLavaGlow';
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = 2.99;
  group.add(lava);

  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#594035', roughness: 1, flatShading: true });
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    const size = 0.32 + (index % 3) * 0.09;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMaterial);
    rock.name = `DinosaurVolcanoBaseRock-${index + 1}`;
    rock.position.set(Math.cos(angle) * 1.75, size * 0.42, Math.sin(angle) * 1.75);
    rock.rotation.set(index * 0.13, index * 0.49, index * 0.08);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
}

function nest(group) {
  const bed = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.52, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: '#594432', roughness: 1, flatShading: true }),
  );
  bed.name = 'DinosaurNestBowl';
  bed.position.y = 0.2;
  bed.scale.set(1.05, 1, 0.9);
  bed.castShadow = true;
  bed.receiveShadow = true;
  group.add(bed);

  const twigMaterial = new THREE.MeshStandardMaterial({ color: '#79543b', roughness: 1 });
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 1.18, 6), twigMaterial);
    twig.name = `DinosaurNestTwig-${index + 1}`;
    twig.position.set(Math.cos(angle) * 1.3, 0.39 + (index % 3) * 0.07, Math.sin(angle) * 1.12);
    twig.rotation.set(0.12 * (index % 2), -angle, Math.PI / 2 + (index % 3) * 0.12);
    twig.castShadow = true;
    group.add(twig);
  }

  const eggColors = ['#d6bf8a', '#b9b987', '#dec9a0'];
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2 + 0.3;
    const egg = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 10, 8),
      new THREE.MeshStandardMaterial({ color: eggColors[index], roughness: 0.82, flatShading: true }),
    );
    egg.name = `DinosaurNestEgg-${index + 1}`;
    egg.position.set(Math.cos(angle) * 0.47, 0.66, Math.sin(angle) * 0.43);
    egg.scale.set(0.8, 1.18, 0.82);
    egg.rotation.z = (index - 1) * 0.12;
    egg.castShadow = true;
    egg.receiveShadow = true;
    group.add(egg);
  }

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#79674f', roughness: 1, flatShading: true });
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (index % 2) * 0.08, 0), stoneMaterial);
    rock.name = `DinosaurNestRingRock-${index + 1}`;
    rock.position.set(Math.cos(angle) * 1.62, 0.21, Math.sin(angle) * 1.4);
    rock.scale.y = 1.25;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
}

const landmarkBuilders = Object.freeze({
  'dinosaur-fossil-site': fossilSite,
  'dinosaur-volcano': volcano,
  'dinosaur-nest': nest,
});

export function createDinosaurLandmarks(
  scene,
  groundHeightAt = dinosaurGroundHeightAt,
  definitions = DINOSAUR_LANDMARKS,
) {
  return definitions.map((definition) => {
    const builder = landmarkBuilders[definition.id];
    if (!builder) throw new Error(`未知的恐龍世界地標：${definition.id}`);

    const object3D = new THREE.Group();
    object3D.name = `DinosaurLandmark-${definition.id}`;
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
      object3D,
    };
  });
}
