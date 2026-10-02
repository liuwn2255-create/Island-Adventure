export const NPC_MOVEMENT_STATES = Object.freeze({
  WALK_TO_POINT: 'WALK_TO_POINT',
  WAIT_AT_POINT: 'WAIT_AT_POINT',
  WALK_TO_START: 'WALK_TO_START',
  WAIT_AT_START: 'WAIT_AT_START',
});

/** Moves one NPC along a fixed, ground-following two-point patrol. */
export class NPCMovement {
  constructor({
    group,
    groundHeightAt,
    pointA,
    speed = 1.2,
    waitAtPoint = 2.5,
    waitAtStart = 4,
  }) {
    this.group = group;
    this.groundHeightAt = groundHeightAt;
    this.start = { x: group.position.x, z: group.position.z };
    this.pointA = { x: pointA.x, z: pointA.z };
    this.speed = speed;
    this.waitAtPoint = waitAtPoint;
    this.waitAtStart = waitAtStart;
    this.state = NPC_MOVEMENT_STATES.WALK_TO_POINT;
    this.waitRemaining = 0;
    this.paused = false;
    this.group.position.y = this.groundHeightAt(this.group.position.x, this.group.position.z);
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  update(deltaSeconds) {
    if (this.paused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    let remaining = deltaSeconds;
    // A large frame delta may cross more than one waypoint state.
    for (let transitions = 0; remaining > 0 && transitions < 6; transitions += 1) {
      if (this.state === NPC_MOVEMENT_STATES.WAIT_AT_POINT
        || this.state === NPC_MOVEMENT_STATES.WAIT_AT_START) {
        const elapsed = Math.min(remaining, this.waitRemaining);
        this.waitRemaining -= elapsed;
        remaining -= elapsed;
        if (this.waitRemaining > 1e-9) break;
        this.state = this.state === NPC_MOVEMENT_STATES.WAIT_AT_POINT
          ? NPC_MOVEMENT_STATES.WALK_TO_START
          : NPC_MOVEMENT_STATES.WALK_TO_POINT;
        continue;
      }

      const destination = this.state === NPC_MOVEMENT_STATES.WALK_TO_POINT
        ? this.pointA
        : this.start;
      const dx = destination.x - this.group.position.x;
      const dz = destination.z - this.group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 1e-9) {
        this.arrive();
        continue;
      }

      const travel = Math.min(distance, this.speed * remaining);
      const ratio = travel / distance;
      this.group.position.x += dx * ratio;
      this.group.position.z += dz * ratio;
      this.group.position.y = this.groundHeightAt(this.group.position.x, this.group.position.z);
      // The model's local forward axis is +Z.
      this.group.rotation.y = Math.atan2(dx, dz);
      remaining -= travel / this.speed;

      if (travel >= distance - 1e-9) {
        this.group.position.x = destination.x;
        this.group.position.z = destination.z;
        this.group.position.y = this.groundHeightAt(destination.x, destination.z);
        this.arrive();
      } else {
        break;
      }
    }
  }

  arrive() {
    if (this.state === NPC_MOVEMENT_STATES.WALK_TO_POINT) {
      this.state = NPC_MOVEMENT_STATES.WAIT_AT_POINT;
      this.waitRemaining = this.waitAtPoint;
    } else if (this.state === NPC_MOVEMENT_STATES.WALK_TO_START) {
      this.state = NPC_MOVEMENT_STATES.WAIT_AT_START;
      this.waitRemaining = this.waitAtStart;
    }
  }
}