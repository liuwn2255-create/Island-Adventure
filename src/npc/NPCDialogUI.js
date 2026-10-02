import './npcDialog.css';

/** A mutually exclusive, pausing conversation panel for one NPC. */
export class NPCDialogUI {
  constructor({ app, panelCoordinator, config, onOpenChange = () => {} }) {
    this.panelCoordinator = panelCoordinator;
    this.onOpenChange = onOpenChange;
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'npc-dialog-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = `
      <section class="npc-dialog-card" role="dialog" aria-modal="true" aria-labelledby="npc-dialog-title">
        <button class="npc-dialog-close" type="button" aria-label="關閉對話">×</button>
        <p class="npc-dialog-eyebrow">💬 島上居民</p>
        <h2 id="npc-dialog-title"></h2>
        <p class="npc-dialog-line"></p>
        <p class="npc-dialog-line"></p>
        <button class="npc-dialog-continue" type="button">繼續</button>
      </section>
    `;
    app.appendChild(this.backdrop);
    this.title = this.backdrop.querySelector('#npc-dialog-title');
    this.lines = [...this.backdrop.querySelectorAll('.npc-dialog-line')];
    this.closeButton = this.backdrop.querySelector('.npc-dialog-close');
    this.continueButton = this.backdrop.querySelector('.npc-dialog-continue');
    this.title.textContent = config.name;
    this.lines.forEach((line, index) => { line.textContent = config.dialogue[index] ?? ''; });

    this.onClose = () => panelCoordinator.close('npc-dialog');
    this.onBackdropClick = (event) => { if (event.target === this.backdrop) this.onClose(); };
    this.closeButton.addEventListener('click', this.onClose);
    this.continueButton.addEventListener('click', this.onClose);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    this.unregisterPanel = panelCoordinator.register('npc-dialog', (open) => {
      this.backdrop.hidden = !open;
      this.onOpenChange(open);
      if (open) this.continueButton.focus();
    });
  }

  open() { return this.panelCoordinator.open('npc-dialog'); }

  dispose() {
    this.unregisterPanel();
    this.closeButton.removeEventListener('click', this.onClose);
    this.continueButton.removeEventListener('click', this.onClose);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.backdrop.remove();
  }
}
