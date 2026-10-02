import './natureQuest.css';

export class NatureQuestUI {
  constructor({ app, natureQuestManager, panelCoordinator, showCompletionToast = true }) {
    this.panelCoordinator = panelCoordinator;
    this.isOpen = false;
    this.toastQueue = [];
    this.isShowingToast = false;
    this.toastTimer = null;
    this.showCompletionToast = showCompletionToast;
    this.seenCompleted = new Set(natureQuestManager.getQuests().filter((quest) => quest.completed).map((quest) => quest.id));

    this.toggle = document.createElement('button');
    this.toggle.className = 'nature-quest-toggle';
    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-controls', 'nature-quest-panel');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.textContent = '🌿 自然任務';

    this.panel = document.createElement('section');
    this.panel.className = 'nature-quest-panel';
    this.panel.id = 'nature-quest-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '自然任務');
    this.panel.innerHTML = '<header class="nature-quest-header"><h2>🌿 自然任務</h2><button class="nature-quest-close" type="button" aria-label="關閉自然任務">×</button></header><div class="nature-quest-list"></div>';
    this.toast = document.createElement('div');
    this.toast.className = 'nature-quest-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.toast.hidden = true;
    app.append(this.toggle, this.panel, this.toast);
    this.list = this.panel.querySelector('.nature-quest-list');
    this.closeButton = this.panel.querySelector('.nature-quest-close');
    this.onToggle = () => panelCoordinator.toggle('nature-quests');
    this.onClose = () => { panelCoordinator.close('nature-quests'); this.toggle.focus(); };
    this.onKeyDown = (event) => { if (event.code === 'Escape' && this.isOpen) this.onClose(); };
    this.toggle.addEventListener('click', this.onToggle);
    this.closeButton.addEventListener('click', this.onClose);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('nature-quests', (open) => this.setOpenState(open));
    this.unsubscribe = natureQuestManager.subscribe((quests) => this.render(quests));
    this.unsubscribeCompleted = natureQuestManager.subscribeCompleted((quest) => {
      if (this.seenCompleted.has(quest.id)) return;
      this.seenCompleted.add(quest.id);
      if (this.showCompletionToast) {
        this.toastQueue.push(quest.title);
        this.showNextCompletion();
      }
    });
  }

  setOpenState(open) {
    this.isOpen = open;
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) this.closeButton.focus();
    else this.toggle.focus();
  }

  render(quests) {
    const cards = quests.map((quest) => {
      const card = document.createElement('article');
      card.className = `nature-quest-card${quest.completed ? ' is-complete' : ''}`;
      const heading = document.createElement('h3');
      heading.textContent = `${quest.icon} ${quest.title}`;
      const description = document.createElement('p');
      description.className = 'nature-quest-description';
      description.textContent = quest.description;
      const progress = document.createElement('p');
      progress.className = 'nature-quest-progress';
      progress.textContent = quest.completed ? '✓ 已完成' : `進度：${quest.progress} / ${quest.target}`;
      card.append(heading, description, progress);
      if (quest.completed && !this.seenCompleted.has(quest.id)) {
        this.seenCompleted.add(quest.id);
        if (this.showCompletionToast) this.toastQueue.push(quest.title);
      }
      return card;
    });
    this.list.replaceChildren(...cards);
    if (this.showCompletionToast) this.showNextCompletion();
  }

  showNextCompletion() {
    if (this.isShowingToast || this.toastQueue.length === 0) return;
    const title = this.toastQueue.shift();
    this.isShowingToast = true;
    this.toast.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = '🌿 自然任務完成！';
    const name = document.createElement('span');
    name.textContent = `${title} 已完成！`;
    this.toast.append(heading, name);
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.isShowingToast = false;
      this.showNextCompletion();
    }, 2000);
  }

  dispose() {
    this.unsubscribe();
    this.unsubscribeCompleted();
    this.unregisterPanel();
    this.toggle.removeEventListener('click', this.onToggle);
    this.closeButton.removeEventListener('click', this.onClose);
    window.removeEventListener('keydown', this.onKeyDown);
    window.clearTimeout(this.toastTimer);
    this.toggle.remove(); this.panel.remove(); this.toast.remove();
  }
}
