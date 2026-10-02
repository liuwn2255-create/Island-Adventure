import * as THREE from 'three';

function makeMaterial(color, roughness = 0.86) {
  return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
}

function addLimb(parent, start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const segment = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius, direction.length(), 7, 1),
    material,
  );
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  segment.castShadow = true;
  parent.add(segment);
  return segment;
}

function addSphere(parent, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Builds a lightweight, stylized model from shared low-poly primitives. */
export function createFrog() {
  const group = new THREE.Group();
  group.name = 'TaiwanTreeFrog';

  const body = new THREE.Group();
  body.name = 'FrogBody';
  group.add(body);

  const bodyMaterial = makeMaterial('#756d4d');
  const headMaterial = makeMaterial('#827851');
  const limbMaterial = makeMaterial('#655e43');
  const bellyMaterial = makeMaterial('#c5b995');
  const eyeRingMaterial = makeMaterial('#514a38');
  const eyeMaterial = makeMaterial('#d5c77d', 0.42);
  const pupilMaterial = makeMaterial('#29271f', 0.32);
  const backMarkMaterial = makeMaterial('#494638');
  const glintMaterial = new THREE.MeshBasicMaterial({ color: '#fff7dc' });
  const nostrilMaterial = makeMaterial('#3c392d', 0.5);
  const sphere = new THREE.SphereGeometry(1, 12, 8);

  addSphere(body, sphere, bodyMaterial, [0, 0.3, -0.02], [0.31, 0.23, 0.4]);
  addSphere(body, sphere, bellyMaterial, [0, 0.16, 0.1], [0.245, 0.105, 0.275]);
  addSphere(body, sphere, headMaterial, [0, 0.43, 0.23], [0.275, 0.205, 0.28]);

  for (const angle of [-0.58, 0.58]) {
    const marking = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.25, 2, 5), backMarkMaterial);
    marking.position.set(0, 0.492, -0.045);
    marking.rotation.set(Math.PI / 2, angle, 0);
    marking.castShadow = true;
    body.add(marking);
  }

  for (const side of [-1, 1]) {
    addSphere(body, sphere, eyeRingMaterial, [side * 0.16, 0.59, 0.34], [0.112, 0.13, 0.105]);
    addSphere(body, sphere, eyeMaterial, [side * 0.16, 0.6, 0.365], [0.082, 0.094, 0.078]);
    addSphere(body, sphere, pupilMaterial, [side * 0.16, 0.596, 0.429], [0.041, 0.054, 0.03]);
    addSphere(body, sphere, glintMaterial, [side * 0.16 - 0.012, 0.619, 0.453], [0.014, 0.018, 0.009]);
    addSphere(body, sphere, nostrilMaterial, [side * 0.054, 0.48, 0.501], [0.012, 0.009, 0.008]);

    // Short forelegs and folded, stronger hind legs keep a frog-like silhouette.
    addLimb(body, [side * 0.2, 0.27, 0.16], [side * 0.3, 0.105, 0.34], 0.052, limbMaterial);
    addSphere(body, sphere, limbMaterial, [side * 0.3, 0.08, 0.35], [0.075, 0.035, 0.095]);
    for (let toe = -1; toe <= 1; toe += 1) {
      addSphere(body, sphere, limbMaterial, [side * 0.3 + toe * 0.045, 0.06, 0.41], [0.027, 0.018, 0.046]);
    }

    addSphere(body, sphere, bodyMaterial, [side * 0.245, 0.235, -0.2], [0.15, 0.115, 0.19]);
    addLimb(body, [side * 0.29, 0.2, -0.24], [side * 0.34, 0.085, -0.34], 0.062, limbMaterial);
    addSphere(body, sphere, limbMaterial, [side * 0.34, 0.065, -0.34], [0.085, 0.032, 0.105]);
    for (let toe = -1; toe <= 1; toe += 1) {
      addSphere(body, sphere, limbMaterial, [side * 0.34 + toe * 0.048, 0.05, -0.405], [0.028, 0.018, 0.05]);
    }
  }

  return { group, body };
}
