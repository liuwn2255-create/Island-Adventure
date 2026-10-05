export class AdventureWorldUI {
  constructor({ app, themeManager, onSelect = () => {} }) {
    this.app = app;
    this.themeManager = themeManager;
    this.onSelect = onSelect;
    this.buttons = [];
    this.root = document.createElement('main');
    this.root.className = 'adventure-world-screen';
    this.root.setAttribute('aria-labelledby', 'adventure-world-title');

    const content = document.createElement('section');
    content.className = 'adventure-world-content';
    const heading = document.createElement('header');
    heading.className = 'adventure-world-heading';
    const title = document.createElement('h1');
    title.id = 'adventure-world-title';
    title.textContent = '冒險世界';
    const subtitle = document.createElement('p');
    subtitle.textContent = '選擇你的冒險';
    const scrollHint = document.createElement('span');
    scrollHint.className = 'adventure-world-scroll-hint';
    scrollHint.textContent = '↓ 向下探索更多世界';
    subtitle.appendChild(scrollHint);
    heading.append(title, subtitle);

    const grid = document.createElement('div');
    grid.className = 'adventure-theme-grid';
    for (const state of themeManager.getThemes()) {
      const { theme, canEnter, actionLabel, completed, questProgress, collectibleProgress, hasBadge } = state;
      const card = document.createElement('article');
      card.className = `adventure-theme-card${completed ? ' is-completed' : ''}`;
      const name = document.createElement('h2');
      name.textContent = theme.name;
      const description = document.createElement('p');
      description.textContent = theme.description;
      const summary = document.createElement('div');
      summary.className = 'adventure-theme-summary';
      const completionStatus = document.createElement('p');
      completionStatus.className = `adventure-theme-summary-status${completed ? ' is-completed' : ''}`;
      completionStatus.textContent = completed ? '✅ 已完成' : '⭕ 尚未完成';
      const questSummary = document.createElement('p');
      questSummary.className = 'adventure-theme-summary-quests';
      questSummary.textContent = `任務 ${questProgress.completed}/${questProgress.total}`;
      const collectibleSummary = document.createElement('p');
      collectibleSummary.className = 'adventure-theme-summary-collectibles';
      collectibleSummary.textContent = `收藏 ${collectibleProgress.collected}/${collectibleProgress.total}`;
      const badgeSummary = document.createElement('p');
      badgeSummary.className = 'adventure-theme-summary-badge';
      badgeSummary.textContent = hasBadge ? '🏅 已取得徽章' : '🏅 尚未取得';
      summary.append(completionStatus, questSummary, collectibleSummary, badgeSummary);
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !canEnter;
      button.textContent = actionLabel;
      button.setAttribute('aria-label', `${theme.name}：${button.textContent}`);
      const onClick = async () => {
        if (button.disabled) return;
        const selectedTheme = this.themeManager.selectTheme(theme.id);
        if (selectedTheme) await this.onSelect(selectedTheme);
      };
      button.addEventListener('click', onClick);
      this.buttons.push({ button, onClick });
      card.append(name, description, summary, button);
      grid.appendChild(card);
    }

    content.append(heading, grid);
    this.root.appendChild(content);
    app.replaceChildren(this.root);
  }

  close() {
    this.root.remove();
  }

  destroy() {
    for (const { button, onClick } of this.buttons) button.removeEventListener('click', onClick);
    this.buttons.length = 0;
    this.close();
  }

  dispose() {
    this.destroy();
  }
}
