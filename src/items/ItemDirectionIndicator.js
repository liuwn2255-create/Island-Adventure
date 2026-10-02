import './items.css';

const DIRECTION_ARROWS = Object.freeze(['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']);

export function getRelativeItemDirection(playerPosition, cameraForward, itemPosition) {
  const forwardX = cameraForward.x;
  const forwardZ = cameraForward.z;
  const forwardLength = Math.hypot(forwardX, forwardZ);
  const forward = forwardLength > 1e-8
    ? { x: forwardX / forwardLength, z: forwardZ / forwardLength }
    : { x: 0, z: -1 };
  const right = { x: -forward.z, z: forward.x };

  const targetX = itemPosition.x - playerPosition.x;
  const targetZ = itemPosition.z - playerPosition.z;
  const targetLength = Math.hypot(targetX, targetZ);
  if (targetLength <= 1e-8) return DIRECTION_ARROWS[0];

  const target = { x: targetX / targetLength, z: targetZ / targetLength };
  const forwardDot = target.x * forward.x + target.z * forward.z;
  const rightDot = target.x * right.x + target.z * right.z;
  // Positive angles point toward camera-right, matching the arrow sequence.
  const relativeAngle = Math.atan2(rightDot, forwardDot);
  const directionIndex = Math.round(relativeAngle / (Math.PI / 4));
  return DIRECTION_ARROWS[(directionIndex + 8) % 8];
}

export class ItemDirectionIndicator {
  constructor({ app, player, getTarget, getCameraForward }) {
    this.player = player;
    this.getTarget = getTarget;
    this.getCameraForward = getCameraForward;
    this.element = document.createElement('section');
    this.element.className = 'item-direction-indicator';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.hidden = true;
    this.element.innerHTML = `
      <div class="direction-item-line"><span data-direction-icon></span><span data-direction-name></span></div>
      <div class="direction-reading"><span data-direction-arrow aria-hidden="true"></span><span data-direction-distance></span></div>
    `;
    app.appendChild(this.element);
    this.icon = this.element.querySelector('[data-direction-icon]');
    this.name = this.element.querySelector('[data-direction-name]');
    this.arrow = this.element.querySelector('[data-direction-arrow]');
    this.distance = this.element.querySelector('[data-direction-distance]');
  }

  update() {
    const position = this.player.object3D.position;
    const target = this.getTarget();
    this.element.hidden = !target;
    if (!target) return;
    const distance = Math.hypot(target.position.x - position.x, target.position.z - position.z);
    this.icon.textContent = target.icon;
    this.name.textContent = target.name;
    this.arrow.textContent = getRelativeItemDirection(position, this.getCameraForward(), target.position);
    this.distance.textContent = distance <= target.interactionDistance
      ? '已接近'
      : `約 ${Math.max(1, Math.round(distance))}m`;
  }

  dispose() {
    this.element.remove();
  }
}
