import './interaction.css';

export class InteractionManager {
  constructor({ player, landmarks, items = [], inventory = null, questManager = null, app }) {
    this.player = player;
    this.landmarks = landmarks;
    this.items = items;
    this.inventory = inventory;
    this.questManager = questManager;
    this.nearestLandmark = null;
    this.nearestInteractable = null;
    this.activeLandmark = null;
    this.additionalInteractables = () => [];
    this.suspended = false;
    this.prompt = document.createElement('div');
    this.prompt.className = 'explore-hint';
    this.prompt.setAttribute('role', 'status');
    this.prompt.setAttribute('aria-live', 'polite');
    this.prompt.hidden = true;
    this.prompt.innerHTML = '<span class="hint-press">按</span><kbd>E</kbd><span data-prompt-action>探索</span><span class="hint-divider"></span><span data-hint-title></span>';

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'interaction-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="landmark-dialog" role="dialog" aria-modal="true" aria-labelledby="landmark-title" aria-describedby="landmark-description">
        <button class="dialog-close" type="button" aria-label="關閉視窗">×</button>
        <div class="dialog-emblem" data-dialog-icon aria-hidden="true"></div>
        <p class="dialog-eyebrow">島嶼探索紀錄</p>
        <h2 id="landmark-title" data-dialog-title></h2>
        <p id="landmark-description" class="dialog-description" data-dialog-description></p>
        <button class="dialog-continue" type="button">繼續探索</button>
      </section>
    `;
    this.toast = document.createElement('div');
    this.toast.className = 'item-pickup-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.toast.hidden = true;
    app.append(this.prompt, this.backdrop);
    app.appendChild(this.toast);

    this.closeButton = this.backdrop.querySelector('.dialog-close');
    this.continueButton = this.backdrop.querySelector('.dialog-continue');
    this.promptAction = this.prompt.querySelector('[data-prompt-action]');
    this.toastTimer = null;
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.activeLandmark) {
        event.preventDefault();
        this.closeDialog();
        return;
      }
      if (event.code !== 'KeyE' || event.repeat || !this.nearestInteractable || this.activeLandmark || this.suspended) return;
      event.preventDefault();
      if (this.nearestInteractable.kind === 'item') this.collectItem(this.nearestInteractable.object);
      else if (this.nearestInteractable.kind === 'npc') this.nearestInteractable.object.interact();
      else this.openDialog(this.nearestInteractable.object);
    };
    this.onBackdropClick = (event) => {
      if (event.target === this.backdrop) this.closeDialog();
    };
    this.onCloseClick = () => this.closeDialog();
    window.addEventListener('keydown', this.onKeyDown);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    this.closeButton.addEventListener('click', this.onCloseClick);
    this.continueButton.addEventListener('click', this.onCloseClick);
  }

  update() {
    if (this.activeLandmark || this.suspended) {
      this.prompt.hidden = true;
      return;
    }
    const playerPosition = this.player.object3D.position;
    let nearest = null;
    let nearestDistance = Infinity;
    const candidates = [
      ...this.landmarks.map((object) => ({ object, kind: 'landmark' })),
      ...this.items.filter((item) => !item.collected).map((object) => ({ object, kind: 'item' })),
      ...this.additionalInteractables().map((object) => ({ object, kind: object.kind })),
    ];
    for (const candidate of candidates) {
      const dx = playerPosition.x - candidate.object.position.x;
      const dz = playerPosition.z - candidate.object.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= candidate.object.interactionDistance && distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    this.nearestInteractable = nearest;
    this.nearestLandmark = nearest?.kind === 'landmark' ? nearest.object : null;
    this.prompt.hidden = !nearest;
    if (nearest) {
      this.promptAction.textContent = nearest.kind === 'item' ? '撿取' : nearest.kind === 'npc' ? '對話' : '探索';
      this.prompt.querySelector('[data-hint-title]').textContent = nearest.kind === 'item' ? nearest.object.name : nearest.object.title;
    }
  }

  setAdditionalInteractables(provider) {
    this.additionalInteractables = typeof provider === 'function' ? provider : () => [];
    this.update();
  }

  openDialog(landmark) {
    this.activeLandmark = landmark;
    this.nearestLandmark = landmark;
    this.questManager?.recordLandmarkExplored(landmark.id);
    this.prompt.hidden = true;
    this.backdrop.querySelector('[data-dialog-icon]').textContent = landmark.icon;
    this.backdrop.querySelector('[data-dialog-title]').textContent = landmark.title;
    this.backdrop.querySelector('[data-dialog-description]').textContent = landmark.description;
    this.backdrop.hidden = false;
    this.player.enabled = false;
    this.player.pressed.clear();
    this.closeButton.focus();
  }

  closeDialog() {
    if (!this.activeLandmark) return;
    this.backdrop.hidden = true;
    this.activeLandmark = null;
    this.player.enabled = !this.suspended;
    this.update();
  }

  collectItem(item) {
    if (item.collected) return;
    item.collected = true;
    item.object3D.visible = false;
    this.inventory?.add(item.type);
    this.questManager?.recordCollection(item.id, item.type);
    this.toast.textContent = `✨ 已取得：${item.name}`;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { this.toast.hidden = true; }, 2000);
    this.update();
  }

  saveState() { return { collectedItemIds: this.items.filter((item) => item.collected).map((item) => item.id) }; }

  loadState(state) {
    const collected = new Set(Array.isArray(state?.collectedItemIds) ? state.collectedItemIds : []);
    for (const item of this.items) {
      item.collected = collected.has(item.id);
      item.object3D.visible = !item.collected;
    }
    this.update();
  }

  setSuspended(suspended) {
    this.suspended = suspended;
    this.player.enabled = !suspended && !this.activeLandmark;
    if (suspended) {
      this.player.pressed.clear();
      this.prompt.hidden = true;
    } else {
      this.update();
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.continueButton.removeEventListener('click', this.onCloseClick);
    window.clearTimeout(this.toastTimer);
    this.prompt.remove();
    this.backdrop.remove();
    this.toast.remove();
  }
}
