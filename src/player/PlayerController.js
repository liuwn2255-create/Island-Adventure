import * as THREE from 'three';
import {
  ISLAND_GRASS_TOP,
  ISLAND_WALKABLE_RADIUS,
  PLAYER_COLLISION_RADIUS,
  PLAYER_INITIAL_YAW,
  PLAYER_MOVE_SPEED,
  PLAYER_START_POSITION,
} from '../config/gameConfig.js';
import { getCameraRelativeMovement } from './cameraRelativeMovement.js';

const KEY_TO_AXIS = Object.freeze({
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
});
const DEFAULT_CAMERA_FORWARD = new THREE.Vector3(0, 0, 1);

/**
 * Owns camera-relative world movement and its collision-sized root object.
 * The GLB is attached separately as a child, so this controller has no
 * assumptions about the model's mesh hierarchy, skeleton, or materials.
 */
export class PlayerController {
  constructor(scene, { groundHeightAt = () => ISLAND_GRASS_TOP, getCameraForward = () => DEFAULT_CAMERA_FORWARD } = {}) {
    this.object3D = new THREE.Group();
    this.groundHeightAt = groundHeightAt;
    this.getCameraForward = getCameraForward;
    this.enabled = true;
    this.object3D.name = 'PlayerControllerRoot';
    this.object3D.position.set(PLAYER_START_POSITION.x, this.groundHeightAt(PLAYER_START_POSITION.x, PLAYER_START_POSITION.z), PLAYER_START_POSITION.z);
    this.object3D.rotation.y = PLAYER_INITIAL_YAW;
    scene.add(this.object3D);

    this.pressed = new Set();
    this.externalInput = { right: 0, backward: 0 };
    this.onKeyDown = (event) => {
      if (!this.enabled || !KEY_TO_AXIS[event.code]) return;
      event.preventDefault();
      this.pressed.add(KEY_TO_AXIS[event.code]);
    };
    this.onKeyUp = (event) => {
      if (!this.enabled || !KEY_TO_AXIS[event.code]) return;
      event.preventDefault();
      this.pressed.delete(KEY_TO_AXIS[event.code]);
    };
    this.onWindowBlur = () => {
      this.pressed.clear();
      this.externalInput.right = 0;
      this.externalInput.backward = 0;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  setExternalInput(right, backward) {
    this.externalInput.right = THREE.MathUtils.clamp(right, -1, 1);
    this.externalInput.backward = THREE.MathUtils.clamp(backward, -1, 1);
  }

  update(deltaSeconds) {
    if (!this.enabled) {
      this.pressed.clear();
      this.externalInput.right = 0;
      this.externalInput.backward = 0;
      return;
    }
    const right = THREE.MathUtils.clamp(Number(this.pressed.has('right')) - Number(this.pressed.has('left')) + this.externalInput.right, -1, 1);
    const backward = THREE.MathUtils.clamp(Number(this.pressed.has('backward')) - Number(this.pressed.has('forward')) + this.externalInput.backward, -1, 1);
    if (right === 0 && backward === 0) return;

    const movement = getCameraRelativeMovement({ right, backward }, this.getCameraForward());
    const moveX = movement.x;
    const moveZ = movement.z;
    const nextX = this.object3D.position.x + moveX * PLAYER_MOVE_SPEED * deltaSeconds;
    const nextZ = this.object3D.position.z + moveZ * PLAYER_MOVE_SPEED * deltaSeconds;

    // Keep the player's collision footprint within the circular grassy top.
    const maxCenterRadius = ISLAND_WALKABLE_RADIUS - PLAYER_COLLISION_RADIUS;
    const nextRadius = Math.hypot(nextX, nextZ);
    const boundaryScale = nextRadius > maxCenterRadius ? maxCenterRadius / nextRadius : 1;
    this.object3D.position.x = nextX * boundaryScale;
    this.object3D.position.z = nextZ * boundaryScale;
    this.object3D.rotation.y = Math.atan2(-moveX, -moveZ);
    // There is no gravity in this phase; keep the model's feet on the grass.
    this.object3D.position.y = this.groundHeightAt(this.object3D.position.x, this.object3D.position.z);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
  }
}



