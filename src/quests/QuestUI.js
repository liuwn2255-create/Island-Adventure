import './quest.css';

export class QuestUI {
  constructor({
    app,
    questManager,
    panelCoordinator,
    showCompletionToast = true,
    worldName = null,
    showProgressSummary = false,
  }) {
    this.questManager = questManager;
    this.isOpen = false;
    this.completionQueue = [];
    this.toastTimer = null;
    this.isShowingToast = false;
    this.showCompletionToast = showCompletionToast;
    this.worldName = worldName;
    this.showProgressSummary = showProgressSummary;

    this.toggle = document.createElement('button');
    this.toggle.className = 'quest-toggle';
    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-controls', 'quest-panel');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.textContent = '📜 任務';

    this.panel = document.createElement('section');
    this.panel.className = 'quest-panel';
    this.panel.id = 'quest-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '探險任務');
    this.panel.innerHTML = '<header class="quest-panel-header"><h2>📜 探險任務</h2><button class="quest-close" type="button" aria-label="關閉任務">×</button></header><p class="quest-world-name" hidden></p><p class="quest-overview" hidden></p><div class="quest-list"></div>';

    this.toast = document.createElement('div');
    this.toast.className = 'quest-completion-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.setAttribute('aria-live', 'polite');
    this.toast.hidden = true;

    app.append(this.toggle, this.panel, this.toast);
    this.list = this.panel.querySelector('.quest-list');
    this.worldHeading = this.panel.querySelector('.quest-world-name');
    this.overview = this.panel.querySelector('.quest-overview');
    this.worldHeading.hidden = true;
    this.overview.hidden = true;
    if (this.showProgressSummary) {
      this.worldHeading.hidden = !this.worldName;
      this.worldHeading.textContent = this.worldName ?? '';
    }
    this.closeButton = this.panel.querySelector('.quest-close');
    this.onToggle = () => panelCoordinator.toggle('quests');
    this.onClose = () => {
      panelCoordinator.close('quests');
      this.toggle.focus();
    };
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.isOpen) this.onClose();
    };
    this.toggle.addEventListener('click', this.onToggle);
    this.closeButton.addEventListener('click', this.onClose);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('quests', (open) => this.setOpenState(open));

    this.seenCompleted = new Set();
    this.unsubscribe = questManager.subscribe((quests) => this.render(quests));
  }

  setOpenState(open) {
    this.isOpen = open;
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) this.closeButton.focus();
    else this.toggle.focus();
  }

  render(quests) {
    const completedCount = quests.filter(({ completed }) => completed).length;
    if (this.showProgressSummary) {
      this.overview.hidden = false;
      this.overview.textContent = `任務進度 ${completedCount}/${quests.length}`;
      this.overview.setAttribute('aria-live', 'polite');
    }
    const cards = quests.map((quest) => {
      const card = document.createElement('article');
      card.className = `quest-card${quest.completed ? ' is-complete' : ''}`;

      const heading = document.createElement('h3');
      heading.textContent = `${quest.icon} ${quest.title}`;
      const description = document.createElement('p');
      description.className = 'quest-description';
      description.textContent = quest.description;
      const progress = document.createElement('p');
      progress.className = 'quest-progress';
      progress.textContent = quest.completed
        ? (this.showProgressSummary ? '✅ 已完成' : '✓ 已完成')
        : (this.showProgressSummary ? `⭕ 尚未完成 · 進度：${quest.progress} / ${quest.target}` : `進度：${quest.progress} / ${quest.target}`);
      card.append(heading, description, progress);

      if (quest.completed && !this.seenCompleted.has(quest.id)) {
        this.seenCompleted.add(quest.id);
        if (this.showCompletionToast) this.completionQueue.push(quest.title);
      }
      return card;
    });
    this.list.replaceChildren(...cards);
    if (this.showCompletionToast) this.showNextCompletion();
  }

  showNextCompletion() {
    if (this.isShowingToast || this.completionQueue.length === 0) return;
    const title = this.completionQueue.shift();
    this.isShowingToast = true;
    this.toast.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = '🎉 任務完成！';
    const name = document.createElement('span');
    name.textContent = title;
    this.toast.append(label, name);
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.isShowingToast = false;
      this.showNextCompletion();
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
