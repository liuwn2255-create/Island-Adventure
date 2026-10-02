import './items.css';

export class InventoryUI {
  constructor({ app, inventory, panelCoordinator }) {
    this.inventory = inventory;
    this.isOpen = false;
    this.toggle = document.createElement('button');
    this.toggle.className = 'inventory-toggle';
    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-haspopup', 'dialog');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.textContent = '🎒 背包';
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'inventory-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="inventory-panel" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
        <button class="inventory-close" type="button" aria-label="關閉背包">×</button>
        <div class="inventory-emblem" aria-hidden="true">🎒</div>
        <p class="inventory-eyebrow">你的島嶼發現</p>
        <h2 id="inventory-title">背包</h2>
        <ul class="inventory-list" data-inventory-list></ul>
        <button class="inventory-done" type="button">關閉</button>
      </section>
    `;
    app.append(this.toggle, this.backdrop);
    this.list = this.backdrop.querySelector('[data-inventory-list]');
    this.closeButton = this.backdrop.querySelector('.inventory-close');
    this.doneButton = this.backdrop.querySelector('.inventory-done');
    this.unsubscribe = inventory.subscribe((counts) => this.render(counts));
    this.panelCoordinator = panelCoordinator;
    this.onToggle = () => panelCoordinator.toggle('inventory');
    this.onClose = () => {
      panelCoordinator.close('inventory');
      this.toggle.focus();
    };
    this.onBackdropClick = (event) => {
      if (event.target === this.backdrop) this.close();
    };
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.onClose();
      }
    };
    this.toggle.addEventListener('click', this.onToggle);
    this.closeButton.addEventListener('click', this.onClose);
    this.doneButton.addEventListener('click', this.onClose);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('inventory', (open) => this.setOpenState(open));
  }

  render(counts) {
    this.list.replaceChildren(...this.inventory.types.map((type) => {
      const row = document.createElement('li');
      row.className = 'inventory-row';
      const label = document.createElement('span');
      label.className = 'inventory-item-label';
      label.textContent = `${type.icon} ${type.name}`;
      const count = document.createElement('span');
      count.className = 'inventory-count';
      count.textContent = `× ${counts[type.id] ?? 0}`;
      row.append(label, count);
      return row;
    }));
  }

  open() {
    return this.panelCoordinator.open('inventory');
  }

  close() {
    return this.panelCoordinator.close('inventory');
  }

  setOpenState(open) {
    this.isOpen = open;
    this.backdrop.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) this.closeButton.focus();
  }

  dispose() {
    this.unsubscribe();
    this.unregisterPanel();
    this.toggle.removeEventListener('click', this.onToggle);
    this.closeButton.removeEventListener('click', this.onClose);
    this.doneButton.removeEventListener('click', this.onClose);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    window.removeEventListener('keydown', this.onKeyDown);
    this.toggle.remove();
    this.backdrop.remove();
  }
}
