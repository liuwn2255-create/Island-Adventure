import './natureObservation.css';

export class NatureObservationUI {
  constructor({ app, panelCoordinator, onOpenChange = () => {}, onStartQuiz = () => {} }) {
    this.panelCoordinator = panelCoordinator;
    this.onOpenChange = onOpenChange;
    this.onStartQuiz = onStartQuiz;
    this.entry = null;
    this.firstDiscovery = false;
    this.isOpen = false;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'nature-observation-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = '<section class="nature-observation-card" role="dialog" aria-modal="true" aria-labelledby="nature-observation-title"><header class="nature-observation-header"><span class="nature-observation-icon" aria-hidden="true"></span><div><p class="nature-observation-eyebrow"></p><h2 id="nature-observation-title"></h2></div><button class="nature-observation-x" type="button" aria-label="關閉觀察卡">×</button></header><p class="nature-observation-scientific"></p><p class="nature-observation-category"></p><div class="nature-observation-photo"></div><div class="nature-observation-details"></div><div class="nature-observation-sources"></div><button class="nature-observation-quiz" type="button" hidden>🧠 開始小測驗</button><button class="nature-observation-close" type="button">關閉</button></section>';
    app.append(this.backdrop);
    this.eyebrow = this.backdrop.querySelector('.nature-observation-eyebrow');
    this.icon = this.backdrop.querySelector('.nature-observation-icon');
    this.title = this.backdrop.querySelector('#nature-observation-title');
    this.category = this.backdrop.querySelector('.nature-observation-category');
    this.scientificName = this.backdrop.querySelector('.nature-observation-scientific');
    this.photo = this.backdrop.querySelector('.nature-observation-photo');
    this.details = this.backdrop.querySelector('.nature-observation-details');
    this.sources = this.backdrop.querySelector('.nature-observation-sources');
    this.closeButton = this.backdrop.querySelector('.nature-observation-x');
    this.doneButton = this.backdrop.querySelector('.nature-observation-close');
    this.quizButton = this.backdrop.querySelector('.nature-observation-quiz');

    this.onClose = () => panelCoordinator.close('nature-observation');
    this.onBackdropClick = (event) => {
      if (event.target === this.backdrop) this.onClose();
    };
    this.onKeyDown = (event) => {
      if (event.code === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.onClose();
      }
    };
    this.closeButton.addEventListener('click', this.onClose);
    this.doneButton.addEventListener('click', this.onClose);
    this.onQuizClick = () => this.onStartQuiz(this.entry);
    this.quizButton.addEventListener('click', this.onQuizClick);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    window.addEventListener('keydown', this.onKeyDown);
    this.unregisterPanel = panelCoordinator.register('nature-observation', (open) => this.setOpenState(open));
  }

  open(entry, { firstDiscovery = false } = {}) {
    this.entry = entry;
    this.firstDiscovery = firstDiscovery;
    this.render();
    return this.panelCoordinator.open('nature-observation');
  }

  render() {
    this.quizButton.hidden = this.entry.discovered !== true;
    this.icon.textContent = this.entry.icon || '🌿';
    this.eyebrow.textContent = this.firstDiscovery ? `${this.entry.icon || '🌿'} 發現新生物！` : '🔎 生物觀察';
    this.title.textContent = this.entry.name;
    this.scientificName.textContent = this.entry.scientificName ? `學名：${this.entry.scientificName}` : '';
    this.category.textContent = `分類：${this.entry.category}`;
    this.photo.replaceChildren();
    const photoLabel = document.createElement('span');
    photoLabel.textContent = '📷 真實照片';
    this.photo.append(photoLabel);
    if (this.entry.image) {
      const image = document.createElement('img');
      image.src = this.entry.image;
      image.alt = `${this.entry.name}真實照片`;
      this.photo.append(image);
      if (this.entry.photoCredit) {
        const credit = document.createElement('small');
        credit.textContent = this.entry.photoCredit;
        this.photo.append(credit);
      }
    } else {
      const placeholder = document.createElement('strong');
      placeholder.textContent = '真實照片尚未加入';
      this.photo.append(placeholder);
    }
    this.details.replaceChildren(
      this.createDetail('簡介', this.entry.shortDescription),
      this.createDetail('棲息環境', this.entry.habitat),
      this.createDetail('你知道嗎？', this.entry.funFact),
    );
    this.sources.replaceChildren();
    for (const source of this.entry.dataSources || []) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '查看資料來源';
      link.setAttribute('aria-label', `查看資料來源：${source.name}`);
      this.sources.append(link);
    }
  }

  createDetail(labelText, valueText) {
    const section = document.createElement('section');
    section.className = 'nature-observation-detail';
    const label = document.createElement('h3');
    label.textContent = `${labelText}：`;
    const value = document.createElement('p');
    value.textContent = valueText;
    section.append(label, value);
    return section;
  }

  setOpenState(open) {
    this.isOpen = open;
    this.backdrop.hidden = !open;
    this.onOpenChange(open);
    if (open) this.doneButton.focus();
  }

  dispose() {
    this.unregisterPanel();
    this.closeButton.removeEventListener('click', this.onClose);
    this.doneButton.removeEventListener('click', this.onClose);
    this.quizButton.removeEventListener('click', this.onQuizClick);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    window.removeEventListener('keydown', this.onKeyDown);
    this.backdrop.remove();
  }
}
