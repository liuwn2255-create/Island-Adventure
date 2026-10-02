import { createCharacterPreview } from './CharacterPreview.js';

export function createCharacterSelectionScreen({ app, characters, onStart }) {
  if (!characters.length) throw new Error('至少需要設定一位探險角色。');

  const screen = document.createElement('main');
  screen.className = 'selection-screen';
  screen.innerHTML = `
    <div class="selection-wrap">
      <header class="selection-header">
        <div class="brand-mark" aria-hidden="true">✦</div>
        <span>ISLAND ADVENTURE</span>
        <span class="header-tag">探險準備中</span>
      </header>
      <section class="selection-intro" aria-labelledby="selection-title">
        <p class="eyebrow">YOUR JOURNEY STARTS HERE</p>
        <h1 id="selection-title">選擇你的探險夥伴</h1>
        <p class="intro-copy">挑選一位夥伴，一起出發探索這座神秘小島。</p>
      </section>
      <section class="selection-panel" aria-label="探險角色選擇">
        <div class="preview-column">
          <div class="preview-heading"><span>角色預覽</span><span class="live-dot">3D</span></div>
          <div class="preview-stage" data-preview-stage>
            <div class="preview-sun" aria-hidden="true"></div>
            <div class="preview-loading" data-preview-loading>正在準備角色…</div>
          </div>
          <p class="preview-caption">全方位看看你的探險夥伴</p>
        </div>
        <div class="character-details">
          <p class="eyebrow">MEET YOUR EXPLORER</p>
          <h2 data-character-name></h2>
          <p class="character-description" data-character-description></p>
          <div class="choice-label">選擇探險家</div>
          <div class="character-options" role="group" aria-label="可選角色"></div>
          <div class="selection-note"><span aria-hidden="true">✦</span> 你的探險即將開始</div>
          <button class="start-adventure" type="button" data-start>
            <span>開始探險</span><span class="button-arrow" aria-hidden="true">→</span>
          </button>
          <p class="control-hint" data-control-hint></p>
        </div>
      </section>
      <footer class="selection-footer">一段新的島嶼旅程，正等著你。</footer>
    </div>
  `;
  app.replaceChildren(screen);

  const previewStage = screen.querySelector('[data-preview-stage]');
  const previewLoading = screen.querySelector('[data-preview-loading]');
  const nameElement = screen.querySelector('[data-character-name]');
  const descriptionElement = screen.querySelector('[data-character-description]');
  const optionList = screen.querySelector('.character-options');
  const startButton = screen.querySelector('[data-start]');
  const controlHint = screen.querySelector('[data-control-hint]');
  const hasTouchControls = navigator.maxTouchPoints > 0
    || window.matchMedia?.('(any-pointer: coarse)').matches;
  controlHint.textContent = hasTouchControls
    ? '左下角搖桿移動・右側拖曳看周圍・靠近後按 E'
    : 'W / A / S / D 移動・滑鼠看周圍・靠近後按 E';
  const preview = createCharacterPreview(previewStage);
  let selectedCharacter = characters[0];

  function selectCharacter(character) {
    selectedCharacter = character;
    nameElement.textContent = character.name;
    descriptionElement.textContent = character.description;
    for (const option of optionList.children) {
      const selected = option.dataset.characterId === character.id;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
      option.querySelector('.option-status').textContent = selected ? '✓ 已選取' : '選擇角色';
    }
    previewLoading.classList.remove('hidden');
    previewLoading.textContent = '正在準備角色…';
    preview.showCharacter(character)
      .then(() => previewLoading.classList.add('hidden'))
      .catch((error) => {
        console.error('無法載入角色預覽：', error);
        previewLoading.textContent = '角色預覽載入失敗';
      });
  }

  for (const character of characters) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'character-option';
    option.dataset.characterId = character.id;
    option.setAttribute('aria-pressed', 'false');
    option.innerHTML = `
      <span class="option-avatar" aria-hidden="true">✦</span>
      <span class="option-name"></span>
      <span class="option-status"></span>
    `;
    option.querySelector('.option-name').textContent = character.name;
    option.addEventListener('click', () => selectCharacter(character));
    optionList.appendChild(option);
  }

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    startButton.querySelector('span:first-child').textContent = '正在準備…';
    try {
      await onStart(selectedCharacter);
    } catch (error) {
      console.error('無法開始探險：', error);
      startButton.disabled = false;
      startButton.querySelector('span:first-child').textContent = '開始探險';
      previewLoading.textContent = '載入失敗，請再試一次';
      previewLoading.classList.remove('hidden');
    }
  });

  selectCharacter(selectedCharacter);
  return {
    dispose() {
      preview.dispose();
      screen.remove();
    },
  };
}



