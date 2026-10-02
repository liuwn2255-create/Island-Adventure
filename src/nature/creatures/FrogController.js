import * as THREE from 'three';
import { FROG_CONFIG } from './frogConfig.js';

const CROUCH_DURATION = 0.18;
const HOP_DURATION = 0.42;
const LAND_DURATION = 0.16;
const HOP_HEIGHT = 0.42;

/** A calm, bounded hop cycle; this is an ambient creature, not an AI agent. */
export class FrogController {
  constructor({ group, body, groundHeightAt, habitatManager, config = FROG_CONFIG }) {
    this.group = group;
    this.body = body;
    this.groundHeightAt = groundHeightAt;
    this.habitatManager = habitatManager;
    this.config = config;
    this.elapsed = 0;
    this.phase = 'idle';
    this.phaseTime = 0;
    this.paused = false;
    this.nextHopIn = this.randomInterval();
    this.start = new THREE.Vector3();
    this.destination = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.areaId = habitatManager.getDefaultAreaId(config.id);
    const start = habitatManager.getRandomActivityPosition(config.id, { areaId: this.areaId });
    if (!start) throw new Error(`No safe habitat position is configured for ${config.id}`);
    this.group.position.set(start.x, start.y, start.z);
    this.group.rotation.y = 0;
  }

  randomInterval() {
    const { min, max } = this.config.hopInterval;
    return min + Math.random() * (max - min);
  }

  beginCrouch() {
    this.phase = 'crouch';
    this.phaseTime = 0;
    this.start.copy(this.group.position);
    const destination = this.habitatManager.getRandomActivityPosition(this.config.id, {
      areaId: this.areaId,
      origin: this.start,
      maxDistance: this.config.hopRadius,
    });
    if (!destination) {
      this.phase = 'idle';
      this.phaseTime = 0;
      this.nextHopIn = this.randomInterval();
      return;
    }
    this.destination.set(destination.x, 0, destination.z);
    this.direction.set(this.destination.x - this.start.x, 0, this.destination.z - this.start.z);
    if (this.direction.lengthSq() > 1e-6) this.group.rotation.y = Math.atan2(this.direction.x, this.direction.z);
  }

  update(deltaSeconds) {
    if (this.paused) return;
    const delta = Math.min(deltaSeconds, 0.1);
    this.elapsed += delta;

    if (this.phase === 'idle') {
      this.nextHopIn -= delta;
      this.body.scale.y = THREE.MathUtils.damp(this.body.scale.y, 1, 7, delta);
      if (this.nextHopIn <= 0) this.beginCrouch();
      return;
    }

    this.phaseTime += delta;
    if (this.phase === 'crouch') {
      const progress = THREE.MathUtils.clamp(this.phaseTime / CROUCH_DURATION, 0, 1);
      this.body.scale.y = 1 - Math.sin(progress * Math.PI) * 0.2;
      this.group.position.y = this.groundHeightAt(this.group.position.x, this.group.position.z);
      if (progress >= 1) {
        this.phase = 'hop';
        this.phaseTime = 0;
      }
      return;
    }

    if (this.phase === 'hop') {
      const progress = THREE.MathUtils.clamp(this.phaseTime / HOP_DURATION, 0, 1);
      this.group.position.x = THREE.MathUtils.lerp(this.start.x, this.destination.x, progress);
      this.group.position.z = THREE.MathUtils.lerp(this.start.z, this.destination.z, progress);
      const ground = this.groundHeightAt(this.group.position.x, this.group.position.z);
      this.group.position.y = ground + Math.sin(progress * Math.PI) * HOP_HEIGHT;
      this.group.rotation.z = -Math.sin(progress * Math.PI) * 0.12;
      this.body.scale.y = 1 + Math.sin(progress * Math.PI) * 0.09;
      if (progress >= 1) {
        this.phase = 'land';
        this.phaseTime = 0;
        this.group.rotation.z = 0;
      }
      return;
    }

    if (this.phase === 'land') {
      this.group.position.y = this.groundHeightAt(this.group.position.x, this.group.position.z);
      this.body.scale.y = 1 - Math.max(0, 1 - this.phaseTime / LAND_DURATION) * 0.12;
      if (this.phaseTime >= LAND_DURATION) {
        this.phase = 'idle';
        this.phaseTime = 0;
        this.nextHopIn = this.randomInterval();
        this.body.scale.y = 1;
      }
    }
  }

  setPaused(paused) {
    this.paused = paused;
  }
}
