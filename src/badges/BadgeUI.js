import { BADGES } from './badgeConfig.js';
import './badge.css';

export class BadgeUI {
  constructor({ app, badgeManager, panelCoordinator, shouldShowUnlockToast = () => true }) {
    this.badgeManager = badgeManager;
    this.panelCoordinator = panelCoordinator;
    this.shouldShowUnlockToast = shouldShowUnlockToast;
    this.isOpen = false;
    this.completionQueue = [];
    this.isShowingToast = false;
    this.toastTimer = null;
    this.previousUnlocked = new Set(badgeManager.getBadges().map((badge) => badge.id));

    this.toggle = document.createElement('button');
    this.toggle.className = 'badge-toggle';
    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-controls', 'badge-panel');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.textContent = '🏅 徽章';

    this.panel = document.createElement('section');
    this.panel.className = 'badge-panel';
    this.panel.id = 'badge-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '探險徽章');
    this.panel.innerHTML = '<header class="badge-panel-header"><h2>🏅 探險徽章</h2><button class="badge-close" type="button" aria-label="關閉徽章">×</button></header><div class="badge-list"></div>';

    this.toast = document.createElement('div');
    this.toast.className = 'badge-unlock-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.toast.hidden = true;

    app.append(this.toggle, this.panel, this.toast);
    this.list = this.panel.querySelector('.badge-list');
    this.closeButton = this.panel.querySelector('.badge-close');
    this.onToggle = () => panelCoordinator.toggle('badges');
    this.onClose = () => {
      panelCoordinator.close('badges');
      this.toggle.focus();
    };
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.isOpen) this.onClose();
    };
    this.toggle.addEventListener('click', this.onToggle);
    this.closeButton.addEventListener('click', this.onClose);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('badges', (open) => this.setOpenState(open));
    this.unsubscribe = badgeManager.subscribe((unlocked) => this.render(unlocked));
  }

  setOpenState(open) {
    this.isOpen = open;
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) this.closeButton.focus();
  }

  render(unlockedBadges) {
    const unlockedIds = new Set(unlockedBadges.map((badge) => badge.id));
    const cards = BADGES.map((badge) => {
      const unlocked = unlockedIds.has(badge.id);
      const card = document.createElement('article');
      card.className = `badge-card${unlocked ? ' is-unlocked' : ' is-locked'}`;

      const icon = document.createElement('span');
      icon.className = 'badge-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = badge.icon;
      const content = document.createElement('div');
      content.className = 'badge-copy';
      const title = document.createElement('h3');
      title.textContent = badge.title;
      const description = document.createElement('p');
      description.textContent = badge.description;
      const status = document.createElement('span');
      status.className = 'badge-status';
      status.textContent = unlocked ? '已取得' : '尚未取得';
      content.append(title, description, status);
      card.append(icon, content);

      if (unlocked && !this.previousUnlocked.has(badge.id) && this.shouldShowUnlockToast(badge)) this.completionQueue.push(badge);
      return card;
    });
    this.previousUnlocked = unlockedIds;
    this.list.replaceChildren(...cards);
    this.showNextUnlock();
  }

  showNextUnlock() {
    if (this.isShowingToast || this.completionQueue.length === 0) return;
    const badge = this.completionQueue.shift();
    this.isShowingToast = true;
    this.toast.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = '🏅 徽章取得！';
    const name = document.createElement('span');
    name.textContent = `${badge.icon} ${badge.title}`;
    this.toast.append(label, name);
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.isShowingToast = false;
      this.showNextUnlock();
    }, 2000);
  }

  dispose() {
    this.unsubscribe();
    this.unregisterPanel();
    this.toggle.removeEventListener('click', this.onToggle);
    this.closeButton.removeEventListener('click', this.onClose);
    window.removeEventListener('keydown', this.onKeyDown);
    window.clearTimeout(this.toastTimer);
    this.toggle.remove();
    this.panel.remove();
    this.toast.remove();
  }
}
