import * as THREE from 'three';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_MODEL_HEIGHT } from '../config/gameConfig.js';

// Player assets face +Z, while PlayerController faces movement along local -Z.
export const PLAYER_MODEL_FORWARD_OFFSET = Math.PI;

/** Plays the supplied walk clip while the controller is moving the player. */
export class PlayerAnimationController {
  constructor(root, animations = []) {
    this.root = root;
    this.mixer = new AnimationMixer(root);
    this.walkClip = animations.find((clip) => ['walk', 'walking'].includes(clip.name?.toLowerCase())) ?? null;
    this.idleClip = animations.find((clip) => clip.name?.toLowerCase() === 'idle') ?? null;
    this.walkAction = this.walkClip ? this.mixer.clipAction(this.walkClip) : null;
    this.idleAction = this.idleClip ? this.mixer.clipAction(this.idleClip) : null;
    this.currentAction = null;
    this.setMoving(false);
  }

  setMoving(moving) {
    const nextAction = moving ? this.walkAction : this.idleAction;
    if (nextAction === this.currentAction) return;
    this.currentAction?.stop();
    this.currentAction = nextAction;
    if (nextAction) nextAction.reset().play();
  }

  update(deltaSeconds) {
    if (deltaSeconds > 0) this.mixer.update(deltaSeconds);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}

function loadGLTF(path, loaderFactory) {
  const loader = loaderFactory();
  return new Promise((resolve, reject) => loader.load(path, resolve, undefined, reject));
}

/** Load any GLB as a normalized visual child; movement never inspects its internals. */
export function loadPlayerModel(path, { yawOffset = 0, fallbackPath = null, loaderFactory = () => new GLTFLoader() } = {}) {
  if (!path) return Promise.reject(new Error('未設定角色模型路徑。'));
  return loadGLTF(path, loaderFactory).catch((primaryError) => {
    if (!fallbackPath || fallbackPath === path) throw primaryError;
    return loadGLTF(fallbackPath, loaderFactory).catch((fallbackError) => {
      fallbackError.cause ??= primaryError;
      throw fallbackError;
    });
  }).then((gltf) => {
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
    visualRoot.userData.playerAnimationController = new PlayerAnimationController(visualRoot, gltf.animations);

    model.traverse((part) => {
      if (part.isMesh) {
        part.castShadow = true;
        part.receiveShadow = true;
      }
    });
    return visualRoot;
  });
}
