import './firstExplorationTutorial.css';

const TUTORIAL_STEPS = {
  desktop: [
    { icon: '🎮', title: '探索島嶼', description: '用 W A S D 移動', action: '下一步' },
    { icon: '🖱️', title: '看看周圍', description: '移動滑鼠可以控制視角', action: '下一步' },
    { icon: '🔎', title: '發現有趣的東西', description: '靠近目標，看到 E 提示時，按 E 就可以探索。', action: '開始探索' },
  ],
  touch: [
    { icon: '🎮', title: '探索島嶼', description: '用左下角搖桿移動', action: '下一步' },
    { icon: '👆', title: '看看周圍', description: '在畫面右側拖曳，可以控制視角', action: '下一步' },
    { icon: '🔎', title: '發現有趣的東西', description: '靠近目標，看到 E 提示時，按 E 就可以探索。', action: '開始探索' },
  ],
};

export class FirstExplorationTutorial {
  constructor({ app, panelCoordinator, onDismiss = () => {}, onFirstRunComplete = () => {}, onOpenChange = () => {}, isTouch = false }) {
    this.panelCoordinator = panelCoordinator;
    this.onDismiss = onDismiss;
    this.onFirstRunComplete = onFirstRunComplete;
    this.onOpenChange = onOpenChange;
    this.steps = isTouch ? TUTORIAL_STEPS.touch : TUTORIAL_STEPS.desktop;
    this.stepIndex = 0;
    this.firstRun = false;
    this.dismissReason = 'escape';
    this.wasOpen = false;

    this.helpButton = document.createElement('button');
    this.helpButton.className = 'tutorial-help-toggle';
    this.helpButton.type = 'button';
    this.helpButton.textContent = '❓';
    this.helpButton.setAttribute('aria-label', '重新查看新手操作說明');
    this.helpButton.setAttribute('aria-haspopup', 'dialog');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'first-tutorial-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="first-tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="first-tutorial-title" aria-describedby="first-tutorial-description">
        <div class="first-tutorial-icon" aria-hidden="true"></div>
        <p class="first-tutorial-step"></p>
        <h2 id="first-tutorial-title"></h2>
        <p class="first-tutorial-description" id="first-tutorial-description"></p>
        <div class="first-tutorial-actions">
          <button class="first-tutorial-primary" type="button"></button>
          <button class="first-tutorial-skip" type="button">跳過教學</button>
        </div>
      </section>
    `;
    this.icon = this.backdrop.querySelector('.first-tutorial-icon');
    this.stepLabel = this.backdrop.querySelector('.first-tutorial-step');
    this.title = this.backdrop.querySelector('#first-tutorial-title');
    this.description = this.backdrop.querySelector('.first-tutorial-description');
    this.primaryButton = this.backdrop.querySelector('.first-tutorial-primary');
    this.skipButton = this.backdrop.querySelector('.first-tutorial-skip');

    this.unregisterPanel = panelCoordinator.register('tutorial', (open) => this.setOpen(open));
    this.onHelpClick = () => this.open({ firstRun: false });
    this.onPrimaryClick = () => {
      if (this.stepIndex < this.steps.length - 1) {
        this.stepIndex += 1;
        this.renderStep();
      } else {
        this.dismissReason = 'complete';
        panelCoordinator.close('tutorial');
      }
    };
    this.onSkipClick = () => {
      this.dismissReason = 'skip';
      panelCoordinator.close('tutorial');
    };
    this.helpButton.addEventListener('click', this.onHelpClick);
    this.primaryButton.addEventListener('click', this.onPrimaryClick);
    this.skipButton.addEventListener('click', this.onSkipClick);
    app.append(this.helpButton, this.backdrop);
  }

  open({ firstRun = false } = {}) {
    if (this.panelCoordinator.activePanelId === 'tutorial') return true;
    this.firstRun = firstRun;
    this.dismissReason = 'escape';
    this.stepIndex = 0;
    this.renderStep();
    return this.panelCoordinator.open('tutorial');
  }

  renderStep() {
    const step = this.steps[this.stepIndex];
    this.icon.textContent = step.icon;
    this.stepLabel.textContent = `第 ${this.stepIndex + 1} 步 · 共 ${this.steps.length} 步`;
    this.title.textContent = step.title;
    this.description.textContent = step.description;
    this.primaryButton.textContent = step.action;
  }

  setOpen(open) {
    this.backdrop.hidden = !open;
    this.helpButton.setAttribute('aria-expanded', String(open));
    this.onOpenChange(open);
    if (open) {
      this.wasOpen = true;
      this.skipButton.focus();
      return;
    }
    if (!this.wasOpen) return;
    this.wasOpen = false;
    const wasFirstRun = this.firstRun;
    const reason = this.dismissReason;
    this.firstRun = false;
    this.onDismiss({ firstRun: wasFirstRun, reason });
    if (wasFirstRun) this.onFirstRunComplete({ reason });
    this.dismissReason = 'escape';
  }

  dispose() {
    this.unregisterPanel();
    this.helpButton.removeEventListener('click', this.onHelpClick);
    this.primaryButton.removeEventListener('click', this.onPrimaryClick);
    this.skipButton.removeEventListener('click', this.onSkipClick);
    this.helpButton.remove();
    this.backdrop.remove();
  }
}
