import './exitAdventure.css';

/** Exit confirmation UI registered as a mutually exclusive game panel. */
export class ExitAdventureUI {
  constructor({ app, panelCoordinator, onLeave, onOpenChange = () => {} }) {
    this.panelCoordinator = panelCoordinator;
    this.onLeave = onLeave;
    this.button = document.createElement('button');
    this.button.className = 'home-toggle';
    this.button.type = 'button';
    this.button.textContent = '🏠 首頁';
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-label', '返回首頁');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'exit-adventure-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="exit-adventure-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-adventure-title">
        <div class="exit-adventure-icon" aria-hidden="true">🏝️</div>
        <h2 id="exit-adventure-title">要離開探險嗎？</h2>
        <p>目前進度會自動儲存。</p>
        <div class="exit-adventure-actions">
          <button class="exit-continue" type="button">繼續探險</button>
          <button class="exit-home" type="button">回到首頁</button>
        </div>
      </section>
    `;
    app.append(this.button, this.backdrop);
    this.continueButton = this.backdrop.querySelector('.exit-continue');
    this.leaveButton = this.backdrop.querySelector('.exit-home');
    this.onOpenChange = (open) => {
      this.backdrop.hidden = !open;
      this.button.setAttribute('aria-expanded', String(open));
      onOpenChange(open);
      if (open) this.continueButton.focus();
      else this.button.focus();
    };
    this.unregisterPanel = panelCoordinator.register('exit-confirm', this.onOpenChange);
    this.onToggle = () => panelCoordinator.toggle('exit-confirm');
    this.onContinue = () => panelCoordinator.close('exit-confirm');
    this.onLeaveClick = () => {
      panelCoordinator.close('exit-confirm');
      this.onLeave();
    };
    this.onBackdropClick = (event) => {
      if (event.target === this.backdrop) this.onContinue();
    };
    this.button.addEventListener('click', this.onToggle);
    this.continueButton.addEventListener('click', this.onContinue);
    this.leaveButton.addEventListener('click', this.onLeaveClick);
    this.backdrop.addEventListener('click', this.onBackdropClick);
  }

  open() { return this.panelCoordinator.open('exit-confirm'); }
  close() { return this.panelCoordinator.close('exit-confirm'); }

  dispose() {
    this.unregisterPanel();
    this.button.removeEventListener('click', this.onToggle);
    this.continueButton.removeEventListener('click', this.onContinue);
    this.leaveButton.removeEventListener('click', this.onLeaveClick);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.button.remove();
    this.backdrop.remove();
  }
}
