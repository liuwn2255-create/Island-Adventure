import './mobileControls.css';

const JOYSTICK_RADIUS = 48;

function supportsTouchControls() {
  return navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches;
}

/** Touch-only input adapter: sends movement axes to the controller and camera
 * deltas to the scene without depending on the selected character model. */
export class MobileControls {
  constructor({ app, canvas, player, onCameraChange }) {
    this.enabled = supportsTouchControls();
    this.player = player;
    this.canvas = canvas;
    this.onCameraChange = onCameraChange;
    this.stickPointerId = null;
    this.cameraPointerId = null;

    if (!this.enabled) return;

    this.joystick = document.createElement('div');
    this.joystick.className = 'virtual-joystick';
    this.joystick.setAttribute('role', 'group');
    this.joystick.setAttribute('aria-label', '移動搖桿');
    this.joystick.innerHTML = '<div class="virtual-joystick-ring"><div class="virtual-joystick-knob"></div></div><span class="joystick-label">移動</span>';
    app.appendChild(this.joystick);
    this.ring = this.joystick.querySelector('.virtual-joystick-ring');
    this.knob = this.joystick.querySelector('.virtual-joystick-knob');

    this.onStickStart = (event) => {
      if (this.stickPointerId !== null) return;
      event.preventDefault();
      this.stickPointerId = event.pointerId;
      this.joystick.classList.add('is-active');
      this.joystick.setPointerCapture(event.pointerId);
      this.updateStick(event);
    };
    this.onStickMove = (event) => {
      if (event.pointerId !== this.stickPointerId) return;
      event.preventDefault();
      this.updateStick(event);
    };
    this.onStickEnd = (event) => {
      if (event.pointerId !== this.stickPointerId) return;
      event.preventDefault();
      this.stickPointerId = null;
      this.joystick.classList.remove('is-active');
      this.knob.style.transform = 'translate(0, 0)';
      this.player.setExternalInput(0, 0);
    };
    this.joystick.addEventListener('pointerdown', this.onStickStart);
    this.joystick.addEventListener('pointermove', this.onStickMove);
    this.joystick.addEventListener('pointerup', this.onStickEnd);
    this.joystick.addEventListener('pointercancel', this.onStickEnd);
    this.joystick.addEventListener('lostpointercapture', this.onStickEnd);

    this.onCameraStart = (event) => {
      if (event.pointerType !== 'touch' || this.cameraPointerId !== null) return;
      if (event.clientX < window.innerWidth / 2) return;
      this.cameraPointerId = event.pointerId;
      this.lastCameraPoint = { x: event.clientX, y: event.clientY };
    };
    this.onCameraMove = (event) => {
      if (event.pointerId !== this.cameraPointerId) return;
      event.preventDefault();
      const deltaX = event.clientX - this.lastCameraPoint.x;
      const deltaY = event.clientY - this.lastCameraPoint.y;
      this.lastCameraPoint = { x: event.clientX, y: event.clientY };
      this.onCameraChange(deltaX, deltaY);
    };
    this.onCameraEnd = (event) => {
      if (event.pointerId === this.cameraPointerId) this.cameraPointerId = null;
    };
    canvas.addEventListener('pointerdown', this.onCameraStart);
    window.addEventListener('pointermove', this.onCameraMove, { passive: false });
    window.addEventListener('pointerup', this.onCameraEnd);
    window.addEventListener('pointercancel', this.onCameraEnd);

    this.onWindowBlur = () => {
      this.cameraPointerId = null;
      this.stickPointerId = null;
      this.knob.style.transform = 'translate(0, 0)';
      this.joystick.classList.remove('is-active');
      this.player.setExternalInput(0, 0);
    };
    window.addEventListener('blur', this.onWindowBlur);
  }

  updateStick(event) {
    const bounds = this.ring.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > JOYSTICK_RADIUS) {
      dx = (dx / distance) * JOYSTICK_RADIUS;
      dy = (dy / distance) * JOYSTICK_RADIUS;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.player.setExternalInput(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS);
  }

  dispose() {
    if (!this.enabled) return;
    this.joystick.removeEventListener('pointerdown', this.onStickStart);
    this.joystick.removeEventListener('pointermove', this.onStickMove);
    this.joystick.removeEventListener('pointerup', this.onStickEnd);
    this.joystick.removeEventListener('pointercancel', this.onStickEnd);
    this.joystick.removeEventListener('lostpointercapture', this.onStickEnd);
    window.removeEventListener('blur', this.onWindowBlur);
    this.joystick.remove();
    this.canvas.removeEventListener('pointerdown', this.onCameraStart);
    window.removeEventListener('pointermove', this.onCameraMove);
    window.removeEventListener('pointerup', this.onCameraEnd);
    window.removeEventListener('pointercancel', this.onCameraEnd);
  }
}
