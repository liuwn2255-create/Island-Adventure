import './adventureWorld.css';

/** Lightweight entry screen for a theme whose full gameplay runtime is not built yet. */
export class AdventureThemePlaceholderUI {
  constructor({ app, theme, onBack = () => {} }) {
    this.app = app;
    this.onBack = onBack;
    this.root = document.createElement('main');
    this.root.className = 'adventure-world-screen';
    this.root.setAttribute('aria-labelledby', 'adventure-theme-placeholder-title');

    const content = document.createElement('section');
    content.className = 'adventure-world-content';
    const heading = document.createElement('header');
    heading.className = 'adventure-world-heading';
    const title = document.createElement('h1');
    title.id = 'adventure-theme-placeholder-title';
    title.textContent = theme.name;
    heading.appendChild(title);

    const card = document.createElement('section');
    card.className = 'adventure-theme-card adventure-theme-placeholder-card';
    const description = document.createElement('p');
    description.textContent = theme.description;
    this.backButton = document.createElement('button');
    this.backButton.type = 'button';
    this.backButton.textContent = '返回冒險世界';
    this.backButton.setAttribute('aria-label', '返回冒險世界');
    this.onBackClick = () => this.onBack();
    this.backButton.addEventListener('click', this.onBackClick);
    card.append(description, this.backButton);
    content.append(heading, card);
    this.root.appendChild(content);
    app.replaceChildren(this.root);
  }

  destroy() {
    this.backButton.removeEventListener('click', this.onBackClick);
    this.root.remove();
  }

  dispose() {
    this.destroy();
  }
}
