import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Converts the controller's axes into a normalized horizontal world-space vector. */
export function getCameraRelativeMovement({ right = 0, backward = 0 }, cameraForward, target = new THREE.Vector3()) {
  const forward = cameraForward.clone().setY(0);
  if (forward.lengthSq() < 1e-8) forward.set(0, 0, 1);
  forward.normalize();

  const cameraRight = new THREE.Vector3().crossVectors(forward, WORLD_UP).normalize();
  target.copy(cameraRight).multiplyScalar(right).addScaledVector(forward, -backward);
  if (target.lengthSq() > 1) target.normalize();
  return target;
}
