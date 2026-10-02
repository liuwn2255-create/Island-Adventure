import * as THREE from 'three';

export function createButterfly() {
  const group = new THREE.Group();
  group.name = 'GameButterfly';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#42345f', roughness: 0.72 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#f28db2', roughness: 0.58, side: THREE.DoubleSide });
  const lowerWingMaterial = new THREE.MeshStandardMaterial({ color: '#ffc66f', roughness: 0.62, side: THREE.DoubleSide });
  const detailMaterial = new THREE.MeshStandardMaterial({ color: '#fff4bd', roughness: 0.66 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), bodyMaterial);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  const wingPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.035, 0.015, 0);
    pivot.rotation.y = side * 0.08;

    const upperWing = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), wingMaterial);
    upperWing.position.set(side * 0.105, 0.07, 0);
    upperWing.scale.set(0.145, 0.19, 0.035);
    upperWing.castShadow = true;

    const lowerWing = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), lowerWingMaterial);
    lowerWing.position.set(side * 0.09, -0.085, 0.012);
    lowerWing.scale.set(0.105, 0.115, 0.03);
    lowerWing.castShadow = true;

    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 6), detailMaterial);
    spot.position.set(side * 0.145, 0.025, 0.037);
    pivot.add(upperWing, lowerWing, spot);
    group.add(pivot);
    wingPivots.push({ pivot, side });

    const antennaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, 0.025),
      new THREE.Vector3(side * 0.065, 0.16, 0.025),
      new THREE.Vector3(side * 0.11, 0.17, 0.025),
    ]);
    const antenna = new THREE.Mesh(new THREE.TubeGeometry(antennaCurve, 5, 0.009, 4, false), bodyMaterial);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 7, 5), detailMaterial);
    tip.position.set(side * 0.11, 0.17, 0.025);
    group.add(antenna, tip);
  }

  group.scale.setScalar(0.82);
  return { group, wingPivots };
}
