import './questCompletion.css';

/** Presents each first-time general or nature quest completion in one shared modal. */
export class QuestCompletionUI {
  constructor({
    app,
    panelCoordinator,
    interactionManager,
    questManager,
    natureQuestManager,
    getBadgeForCompletion = () => null,
    onOpenChange = () => {},
    onComplete = () => {},
  }) {
    this.panelCoordinator = panelCoordinator;
    this.interactionManager = interactionManager;
    this.getBadgeForCompletion = getBadgeForCompletion;
    this.onOpenChange = onOpenChange;
    this.onComplete = onComplete;
    this.queue = [];
    this.activeCompletion = null;
    this.isOpen = false;
    this.waitingForGameplayModal = false;
    this.isAcknowledgingCompletion = false;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'quest-completion-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="quest-completion-card" role="dialog" aria-modal="true" aria-labelledby="quest-completion-title" aria-describedby="quest-completion-description">
        <div class="quest-completion-confetti" aria-hidden="true">🎉</div>
        <p class="quest-completion-eyebrow"></p>
        <h2 id="quest-completion-title"></h2>
        <p class="quest-completion-description" id="quest-completion-description"></p>
        <div class="quest-completion-badge" hidden></div>
        <p class="quest-completion-next"></p>
        <button class="quest-completion-continue" type="button">繼續探索</button>
      </section>
    `;
    app.append(this.backdrop);
    this.eyebrow = this.backdrop.querySelector('.quest-completion-eyebrow');
    this.title = this.backdrop.querySelector('#quest-completion-title');
    this.description = this.backdrop.querySelector('#quest-completion-description');
    this.badge = this.backdrop.querySelector('.quest-completion-badge');
    this.next = this.backdrop.querySelector('.quest-completion-next');
    this.continueButton = this.backdrop.querySelector('.quest-completion-continue');

    this.unregisterPanel = panelCoordinator.register('quest-completion', (open) => this.setOpenState(open));
    this.unsubscribeQuest = questManager.subscribeCompleted((quest) => {
      this.queue.push({ quest, kind: 'general' });
      this.onComplete({ quest, kind: 'general' });
      queueMicrotask(() => this.openNext());
    });
    this.unsubscribeNatureQuest = natureQuestManager.subscribeCompleted((quest) => {
      this.queue.push({ quest, kind: 'nature' });
      this.onComplete({ quest, kind: 'nature' });
      queueMicrotask(() => this.openNext());
    });
    this.onContinue = () => {
      const completion = this.activeCompletion;
      if (!completion) return;
      this.isAcknowledgingCompletion = true;
      panelCoordinator.close('quest-completion');
      this.isAcknowledgingCompletion = false;
      if (this.queue[0] === completion) this.queue.shift();
      this.activeCompletion = null;
      this.waitingForGameplayModal = false;
      this.openNext();
    };
    this.onBackdropClick = (event) => {
      if (event.target === this.backdrop) this.onContinue();
    };
    this.continueButton.addEventListener('click', this.onContinue);
    this.backdrop.addEventListener('click', this.onBackdropClick);
  }

  openNext() {
    if (this.isOpen || this.queue.length === 0) return false;
    if (this.interactionManager.activeLandmark || (this.panelCoordinator.activePanelId && this.panelCoordinator.activePanelId !== 'quest-completion')) {
      this.waitingForGameplayModal = true;
      return false;
    }

    const completion = this.queue[0];
    const badge = this.getBadgeForCompletion(completion.quest, completion.kind);
    this.render(completion, badge);
    this.activeCompletion = completion;
    if (!this.panelCoordinator.open('quest-completion')) {
      this.activeCompletion = null;
      this.waitingForGameplayModal = true;
      return false;
    }
    this.waitingForGameplayModal = false;
    return true;
  }

  update() {
    if (this.waitingForGameplayModal && !this.interactionManager.activeLandmark && !this.panelCoordinator.activePanelId) this.openNext();
  }

  render({ quest, kind }, badge) {
    this.backdrop.dataset.kind = kind;
    this.eyebrow.textContent = kind === 'nature' ? '🌿 自然任務完成！' : '🎉 任務完成！';
    this.title.textContent = quest.title;
    this.description.textContent = `${quest.description}${/[！。]$/.test(quest.description) ? '' : '！'}`;
    this.badge.hidden = !badge;
    this.badge.replaceChildren();
    if (badge) {
      const label = document.createElement('strong');
      label.textContent = '🏅 新徽章！';
      const name = document.createElement('span');
      name.textContent = `${badge.icon} ${badge.title}`;
      this.badge.append(label, name);
    }
    this.next.textContent = kind === 'nature'
      ? '🌿 島上還有更多生物等你發現！'
      : '🌟 還有更多島嶼秘密等你發現！';
  }

  setOpenState(open) {
    this.isOpen = open;
    this.backdrop.hidden = !open;
    this.onOpenChange(open);
    if (open) this.continueButton.focus();
    else if (this.activeCompletion && !this.isAcknowledgingCompletion) {
      this.waitingForGameplayModal = true;
      queueMicrotask(() => {
        if (this.isOpen || !this.activeCompletion) return;
        if (this.panelCoordinator.activePanelId) return;
        if (this.queue[0] === this.activeCompletion) this.queue.shift();
        this.activeCompletion = null;
        this.waitingForGameplayModal = false;
      });
    }
  }

  dispose() {
    this.unsubscribeQuest();
    this.unsubscribeNatureQuest();
    this.unregisterPanel();
    this.continueButton.removeEventListener('click', this.onContinue);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.backdrop.remove();
  }
}
