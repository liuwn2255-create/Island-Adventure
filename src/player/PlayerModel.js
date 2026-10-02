import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_MODEL_HEIGHT } from '../config/gameConfig.js';

// This GLB's visual front is +Z, while PlayerController faces movement along local -Z.
export const PLAYER_MODEL_FORWARD_OFFSET = Math.PI;

/** Load any GLB as a normalized visual child; movement never inspects its internals. */
export function loadPlayerModel(path, { yawOffset = 0 } = {}) {
  if (!path) return Promise.reject(new Error('未設定角色模型路徑。'));
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const visualRoot = new THREE.Group();
        visualRoot.name = 'PlayerModelVisual';
        visualRoot.rotation.y = yawOffset;
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);
        const sourceHeight = size.y || Math.max(size.x, size.y, size.z) || 1;
        const scale = PLAYER_MODEL_HEIGHT / sourceHeight;

        // Fit and ground-align the entire GLB through a wrapper transform.
        // The loaded asset and its materials are left intact.
        const fit = new THREE.Group();
        fit.name = 'PlayerModelFit';
        fit.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        fit.scale.setScalar(scale);
        fit.add(model);
        visualRoot.add(fit);

        model.traverse((part) => {
          if (part.isMesh) {
            part.castShadow = true;
            part.receiveShadow = true;
          }
        });
        resolve(visualRoot);
      },
      undefined,
      reject,
    );
  });
}
