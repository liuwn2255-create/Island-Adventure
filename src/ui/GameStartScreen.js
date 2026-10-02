import './gameStartScreen.css';

export class GameStartScreen {
  constructor({ app, hasSave = false, onStart, onContinue = onStart, onNewAdventure = onStart }) {
    this.app = app;
    this.onStart = onStart;
    this.screen = document.createElement('main');
    this.screen.className = 'game-start-screen';
    this.screen.setAttribute('aria-labelledby', 'game-start-title');
    this.screen.innerHTML = `
      <div class="game-start-landscape" aria-hidden="true">
        <div class="start-sun"></div>
        <div class="start-island"></div>
        <div class="start-water"></div>
      </div>
      <section class="game-start-card">
        <span class="game-start-emblem" aria-hidden="true">🏝️</span>
        <p class="game-start-kicker">A QUIET ISLAND AWAITS</p>
        <h1 id="game-start-title"><span>ISLAND</span><span>ADVENTURE</span></h1>
        <p class="game-start-subtitle">探索未知的小島</p>
        <ul class="game-start-highlights" aria-label="旅程內容">
          <li>探索自然</li>
          <li>發現生物</li>
          <li>收集寶物</li>
        </ul>
        <div class="game-start-actions">
          <button class="game-start-button game-start-primary" type="button" data-action="start">
            <span>${hasSave ? '繼續探險' : '開始探險'}</span><span aria-hidden="true">→</span>
          </button>
          ${hasSave ? '<button class="game-start-new" type="button" data-action="new">新的探險</button>' : ''}
        </div>
      </section>
    `;
    this.buttons = [...this.screen.querySelectorAll('[data-action]')];
    this.onClicks = this.buttons.map((button) => async () => {
      this.buttons.forEach((entry) => { entry.disabled = true; });
      const action = button.dataset.action;
      const originalLabel = button.querySelector('span:first-child')?.textContent ?? button.textContent;
      if (button.querySelector('span:first-child')) button.querySelector('span:first-child').textContent = '準備出發…';
      else button.textContent = '正在準備…';
      try {
        if (action === 'start') await (hasSave ? onContinue() : onStart());
        else await onNewAdventure();
      } catch (error) {
        console.error('無法開啟探險流程：', error);
        this.buttons.forEach((entry) => { entry.disabled = false; });
        if (button.querySelector('span:first-child')) button.querySelector('span:first-child').textContent = originalLabel;
        else button.textContent = originalLabel;
      }
    });
    this.buttons.forEach((button, index) => button.addEventListener('click', this.onClicks[index]));
    app.replaceChildren(this.screen);
  }

  dispose() {
    this.buttons.forEach((button, index) => button.removeEventListener('click', this.onClicks[index]));
    this.screen.remove();
  }
}
