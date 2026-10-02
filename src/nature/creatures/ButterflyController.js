import * as THREE from 'three';
import { BUTTERFLY_CONFIG } from './butterflyConfig.js';

const ACTIVITY_STEP = 0.52;
const FLIGHT_SPEED = 0.48;

/** Keeps the butterfly in one small habitat patch while it flutters and pauses naturally. */
export class ButterflyController {
  constructor({ group, wingPivots, groundHeightAt, habitatManager, config = BUTTERFLY_CONFIG }) {
    this.group = group;
    this.wingPivots = wingPivots;
    this.groundHeightAt = groundHeightAt;
    this.habitatManager = habitatManager;
    this.config = config;
    this.elapsed = 0;
    this.paused = false;
    this.travelTarget = null;
    this.restTime = 0.75;
    this.direction = new THREE.Vector3();
    this.areaId = habitatManager.getDefaultAreaId(config.id);
    const start = habitatManager.getRandomActivityPosition(config.id, { areaId: this.areaId });
    if (!start) throw new Error(`No safe habitat position is configured for ${config.id}`);
    this.group.position.set(start.x, start.y + config.flightHeight, start.z);
    this.group.rotation.y = 0;
  }

  update(deltaSeconds) {
    if (this.paused) return;
    const delta = Math.min(deltaSeconds, 0.1);
    this.elapsed += delta;

    if (this.restTime > 0) {
      this.restTime = Math.max(0, this.restTime - delta);
    } else {
      if (!this.travelTarget) {
        this.travelTarget = this.habitatManager.getRandomActivityPosition(this.config.id, {
          areaId: this.areaId,
          origin: this.group.position,
          maxDistance: ACTIVITY_STEP,
        });
      }

      if (this.travelTarget) {
        this.direction.set(
          this.travelTarget.x - this.group.position.x,
          0,
          this.travelTarget.z - this.group.position.z,
        );
        const distance = this.direction.length();
        if (distance < 0.025) {
          this.group.position.x = this.travelTarget.x;
          this.group.position.z = this.travelTarget.z;
          this.travelTarget = null;
          this.restTime = 0.55 + Math.random() * 1.25;
        } else {
          this.direction.normalize();
          const step = Math.min(distance, FLIGHT_SPEED * delta);
          this.group.position.x += this.direction.x * step;
          this.group.position.z += this.direction.z * step;
          const targetYaw = Math.atan2(this.direction.x, this.direction.z);
          this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, targetYaw, 2.4, delta);
        }
      } else {
        this.restTime = 0.8;
      }
    }

    const ground = this.groundHeightAt(this.group.position.x, this.group.position.z);
    const phase = this.elapsed * 2.2;
    this.group.position.y = ground + this.config.flightHeight + Math.sin(phase) * 0.055;
    const flap = Math.sin(this.elapsed * 10) * 0.62;
    for (const { pivot, side } of this.wingPivots) pivot.rotation.y = side * (0.08 + flap);
  }

  setPaused(paused) {
    this.paused = paused;
  }
}
