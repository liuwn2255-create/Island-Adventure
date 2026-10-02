import './natureGuide.css';

export class NatureGuideUI {
  constructor({ app, natureGuideManager, panelCoordinator, onOpen = () => {} }) {
    this.panelCoordinator = panelCoordinator;
    this.onOpen = onOpen;
    this.isOpen = false;
    this.toastQueue = [];
    this.isShowingToast = false;
    this.toastTimer = null;
    this.previousDiscovered = new Set(natureGuideManager.getEntries().filter((entry) => entry.discovered).map((entry) => entry.id));

    this.toggle = document.createElement('button');
    this.toggle.className = 'nature-guide-toggle';
    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-controls', 'nature-guide-panel');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.textContent = '🌿 圖鑑';

    this.panel = document.createElement('section');
    this.panel.className = 'nature-guide-panel';
    this.panel.id = 'nature-guide-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '自然圖鑑');
    this.panel.innerHTML = '<header class="nature-guide-header"><h2>📖 自然圖鑑</h2><button class="nature-guide-close" type="button" aria-label="關閉自然圖鑑">×</button></header><p class="nature-guide-count"></p><div class="nature-guide-list"></div>';

    this.toast = document.createElement('div');
    this.toast.className = 'nature-discovery-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.toast.hidden = true;
    app.append(this.toggle, this.panel, this.toast);

    this.count = this.panel.querySelector('.nature-guide-count');
    this.list = this.panel.querySelector('.nature-guide-list');
    this.closeButton = this.panel.querySelector('.nature-guide-close');
    this.onToggle = () => panelCoordinator.toggle('nature');
    this.onClose = () => {
      panelCoordinator.close('nature');
      this.toggle.focus();
    };
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.isOpen) this.onClose();
    };
    this.toggle.addEventListener('click', this.onToggle);
    this.closeButton.addEventListener('click', this.onClose);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('nature', (open) => this.setOpenState(open));
    this.unsubscribe = natureGuideManager.subscribe((entries) => this.render(entries));
  }

  setOpenState(open) {
    this.isOpen = open;
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      this.closeButton.focus();
      this.onOpen();
    }
  }

  render(entries) {
    const discoveredEntries = entries.filter((entry) => entry.discovered);
    const discoveredIds = new Set(discoveredEntries.map((entry) => entry.id));
    this.count.textContent = `已發現 ${discoveredEntries.length} / ${entries.length}`;

    const cards = entries.map((entry) => {
      const card = document.createElement('article');
      card.className = `nature-entry${entry.discovered ? ' is-discovered' : ' is-undiscovered'}`;
      if (!entry.discovered) {
        const title = document.createElement('h3');
        title.textContent = `🔒 ${entry.name}`;
        const locked = document.createElement('p');
        locked.className = 'nature-locked-label';
        locked.textContent = '尚未發現';
        card.append(title, locked);
        return card;
      }

      const title = document.createElement('h3');
      title.textContent = `${entry.icon || '🌿'} ${entry.name}`;
      const photo = document.createElement('div');
      photo.className = 'nature-photo';
      if (entry.image) {
        const image = document.createElement('img');
        image.src = entry.image;
        image.alt = `${entry.name}真實照片`;
        photo.append(image);
      } else {
        photo.textContent = '真實照片尚未加入';
      }

      const details = document.createElement('dl');
      this.addDetail(details, '分類', entry.category);
      if (entry.scientificName) this.addDetail(details, '學名', entry.scientificName);
      this.addDetail(details, '簡介', entry.shortDescription);
      this.addDetail(details, '棲息環境', entry.habitat);
      this.addDetail(details, '你知道嗎？', entry.funFact);
      if (entry.photoCredit) this.addDetail(details, '照片提供', entry.photoCredit);
      const sources = document.createElement('div');
      sources.className = 'nature-entry-sources';
      for (const source of entry.dataSources || []) {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `資料來源：${source.name}`;
        sources.append(link);
      }
      card.append(title, photo, details, sources);
      return card;
    });

    for (const entry of entries) {
      if (entry.discovered && !this.previousDiscovered.has(entry.id)) this.toastQueue.push(entry);
    }
    this.previousDiscovered = discoveredIds;
    this.list.replaceChildren(...cards);
    this.showNextDiscovery();
  }

  addDetail(container, labelText, valueText) {
    const row = document.createElement('div');
    row.className = 'nature-detail';
    const label = document.createElement('dt');
    label.textContent = labelText;
    const value = document.createElement('dd');
    value.textContent = valueText;
    row.append(label, value);
    container.append(row);
  }

  showNextDiscovery() {
    if (this.isShowingToast || this.toastQueue.length === 0) return;
    const entry = this.toastQueue.shift();
    this.isShowingToast = true;
    this.toast.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = '🌿 發現新生物！';
    const name = document.createElement('span');
    name.textContent = `${entry.icon || '🌿'} ${entry.name}`;
    this.toast.append(label, name);
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.isShowingToast = false;
      this.showNextDiscovery();
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
