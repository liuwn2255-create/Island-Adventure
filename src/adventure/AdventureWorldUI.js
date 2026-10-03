import { ADVENTURE_THEMES, canEnterTheme } from './adventureConfig.js';

function getThemeActionLabel(theme, themeProgress) {
  const progress = themeProgress?.[theme.id];
  return progress && progress.status !== 'available' ? '繼續探險' : '開始冒險';
}

export function isAdventureThemeSelectable(theme) {
  return canEnterTheme(theme);
}

export class AdventureWorldUI {
  constructor({ app, themes = ADVENTURE_THEMES, themeProgress = {}, onSelect = () => {} }) {
    this.app = app;
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
    heading.append(title, subtitle);

    const grid = document.createElement('div');
    grid.className = 'adventure-theme-grid';
    for (const theme of themes) {
      const selectable = isAdventureThemeSelectable(theme);
      const card = document.createElement('article');
      card.className = `adventure-theme-card${selectable ? '' : ' is-locked'}`;
      const name = document.createElement('h2');
      name.textContent = theme.name;
      const description = document.createElement('p');
      description.textContent = theme.description;
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !selectable;
      button.textContent = selectable ? getThemeActionLabel(theme, themeProgress) : '尚未開放';
      button.setAttribute('aria-label', `${theme.name}：${button.textContent}`);
      const onClick = async () => {
        if (button.disabled || !isAdventureThemeSelectable(theme)) return;
        await this.onSelect(theme);
      };
      button.addEventListener('click', onClick);
      this.buttons.push({ button, onClick });
      card.append(name, description, button);
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
