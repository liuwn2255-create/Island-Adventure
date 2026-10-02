import * as THREE from 'three';
import { CAMERA_FOLLOW_OFFSET, CAMERA_FOLLOW_SMOOTHING, CAMERA_LOOK_HEIGHT } from '../config/gameConfig.js';

const CAMERA_PITCH_MIN = THREE.MathUtils.degToRad(12);
const CAMERA_PITCH_MAX = THREE.MathUtils.degToRad(55);
const CAMERA_ROTATION_SENSITIVITY = 0.005;

/** Follows the player while keeping camera orientation independent of player facing. */
export class ThirdPersonCamera {
  constructor({ camera, canvas, player }) {
    this.camera = camera;
    this.canvas = canvas;
    this.player = player;
    this.yaw = player.rotation.y;
    this.pitch = THREE.MathUtils.degToRad(24);
    this.distance = Math.hypot(CAMERA_FOLLOW_OFFSET.x, CAMERA_FOLLOW_OFFSET.y, CAMERA_FOLLOW_OFFSET.z);
    this.target = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.pointerId = null;

    this.onPointerDown = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || this.pointerId !== null) return;
      this.pointerId = event.pointerId;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    this.onPointerMove = (event) => {
      if (event.pointerId !== this.pointerId) return;
      event.preventDefault();
      this.rotateBy(event.clientX - this.lastPointer.x, event.clientY - this.lastPointer.y);
      this.lastPointer = { x: event.clientX, y: event.clientY };
    };
    this.onPointerUp = (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
    };
    this.onContextMenu = (event) => event.preventDefault();

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  rotateBy(deltaX, deltaY) {
    this.yaw -= deltaX * CAMERA_ROTATION_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + deltaY * CAMERA_ROTATION_SENSITIVITY,
      CAMERA_PITCH_MIN,
      CAMERA_PITCH_MAX,
    );
  }

  getForwardDirection(target = this.forward) {
    return target.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  update(deltaSeconds) {
    const horizontalDistance = this.distance * Math.cos(this.pitch);
    this.desiredPosition.set(
      Math.sin(this.yaw) * horizontalDistance,
      this.distance * Math.sin(this.pitch),
      Math.cos(this.yaw) * horizontalDistance,
    ).add(this.player.position);
    this.camera.position.lerp(this.desiredPosition, 1 - Math.exp(-CAMERA_FOLLOW_SMOOTHING * deltaSeconds));

    this.target.copy(this.player.position);
    this.target.y += CAMERA_LOOK_HEIGHT;
    this.camera.lookAt(this.target);
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
