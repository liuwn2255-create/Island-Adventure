import './natureQuiz.css';

/** Presents quiz questions and results; scoring remains in NatureQuizManager. */
export class NatureQuizUI {
  constructor({ app, panelCoordinator, quizManager, onOpenChange = () => {} }) {
    this.panelCoordinator = panelCoordinator;
    this.quizManager = quizManager;
    this.onOpenChange = onOpenChange;
    this.isOpen = false;
    this.quiz = null;
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'nature-quiz-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.innerHTML = '<section class="nature-quiz-card" role="dialog" aria-modal="true" aria-labelledby="nature-quiz-title"><header class="nature-quiz-header"><div><p class="nature-quiz-eyebrow">🌿 自然小測驗</p><h2 id="nature-quiz-title"></h2><span class="nature-quiz-zhuyin nature-quiz-species-zhuyin"></span></div><button class="nature-quiz-x" type="button" aria-label="關閉小測驗">×</button></header><div class="nature-quiz-question"></div><div class="nature-quiz-options"></div><section class="nature-quiz-result" aria-live="polite" hidden></section><button class="nature-quiz-retry" type="button" hidden>再挑戰一次</button><button class="nature-quiz-close" type="button">關閉</button></section>';
    app.append(this.backdrop);
    this.title = this.backdrop.querySelector('#nature-quiz-title');
    this.speciesZhuyin = this.backdrop.querySelector('.nature-quiz-species-zhuyin');
    this.question = this.backdrop.querySelector('.nature-quiz-question');
    this.options = this.backdrop.querySelector('.nature-quiz-options');
    this.result = this.backdrop.querySelector('.nature-quiz-result');
    this.retryButton = this.backdrop.querySelector('.nature-quiz-retry');
    this.closeButton = this.backdrop.querySelector('.nature-quiz-close');
    this.xButton = this.backdrop.querySelector('.nature-quiz-x');
    this.onClose = () => panelCoordinator.close('nature-quiz');
    this.onBackdropClick = (event) => { if (event.target === this.backdrop) this.onClose(); };
    this.onKeyDown = (event) => { if (event.code === 'Escape' && this.isOpen) { event.preventDefault(); this.onClose(); } };
    this.onRetry = () => {
      const quiz = this.quizManager.startQuiz(this.quiz.speciesId);
      if (quiz) { this.quiz = quiz; this.render(); }
    };
    this.closeButton.addEventListener('click', this.onClose);
    this.xButton.addEventListener('click', this.onClose);
    this.retryButton.addEventListener('click', this.onRetry);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    window.addEventListener('keydown', this.onKeyDown);
    this.unsubscribe = quizManager.subscribeCompleted(() => { this.quiz = quizManager.getCurrentQuiz(); this.render(); });
    this.unregisterPanel = panelCoordinator.register('nature-quiz', (open) => this.setOpenState(open));
  }

  open(quiz) {
    if (!quiz) return false;
    this.quiz = quiz;
    this.render();
    return this.panelCoordinator.open('nature-quiz');
  }

  render() {
    if (!this.quiz) return;
    this.title.textContent = this.quiz.speciesName;
    this.speciesZhuyin.textContent = this.quiz.speciesZhuyin ?? '';
    this.question.replaceChildren();
    const prompt = document.createElement('span');
    prompt.className = 'nature-quiz-prompt';
    prompt.textContent = this.quiz.question.prompt;
    this.question.append(prompt);
    if (this.quiz.question.promptZhuyin) {
      const promptZhuyin = document.createElement('span');
      promptZhuyin.className = 'nature-quiz-zhuyin nature-quiz-prompt-zhuyin';
      promptZhuyin.textContent = this.quiz.question.promptZhuyin;
      this.question.append(promptZhuyin);
    }
    this.options.replaceChildren();
    const answered = Boolean(this.quiz.result);
    for (const option of this.quiz.question.options) {
      const button = document.createElement('button');
      button.className = 'nature-quiz-option';
      button.type = 'button';
      button.dataset.answer = option.id;
      const marker = document.createElement('span');
      marker.className = 'nature-quiz-option-marker';
      marker.textContent = `${option.id}.`;
      const copy = document.createElement('span');
      copy.className = 'nature-quiz-option-copy';
      const label = document.createElement('span');
      label.className = 'nature-quiz-option-text';
      label.textContent = `${option.icon ? `${option.icon} ` : ''}${option.text}`;
      copy.append(label);
      if (option.zhuyin) {
        const zhuyin = document.createElement('span');
        zhuyin.className = 'nature-quiz-zhuyin nature-quiz-option-zhuyin';
        zhuyin.textContent = option.zhuyin;
        copy.append(zhuyin);
      }
      button.append(marker, copy);
      button.disabled = answered;
      button.addEventListener('click', () => this.quizManager.submitAnswer(option.id));
      this.options.append(button);
    }
    this.result.replaceChildren();
    this.result.hidden = !answered;
    this.retryButton.hidden = !answered;
    if (answered) {
      const heading = document.createElement('strong');
      heading.className = this.quiz.result.correct ? 'is-correct' : 'is-incorrect';
      heading.textContent = this.quiz.result.correct ? '🎉 答對了！' : '再想一下！';
      const detail = document.createElement('p');
      detail.className = 'nature-quiz-result-detail';
      if (this.quiz.result.correct) {
        detail.textContent = this.quiz.result.explanation;
        this.result.append(heading, detail);
      } else {
        const answerLabel = document.createElement('span');
        answerLabel.className = 'nature-quiz-correct-label';
        answerLabel.textContent = '正確答案是：';
        const answer = document.createElement('span');
        answer.className = 'nature-quiz-correct-answer';
        answer.textContent = `${this.quiz.result.correctOptionIcon ? `${this.quiz.result.correctOptionIcon} ` : ''}${this.quiz.result.correctOptionText}`;
        const answerZhuyin = document.createElement('span');
        answerZhuyin.className = 'nature-quiz-zhuyin nature-quiz-correct-zhuyin';
        answerZhuyin.textContent = this.quiz.result.correctOptionZhuyin;
        detail.textContent = this.quiz.result.explanation;
        this.result.append(heading, answerLabel, answer, answerZhuyin, detail);
      }
    }
  }

  setOpenState(open) {
    this.isOpen = open;
    this.backdrop.hidden = !open;
    this.onOpenChange(open);
    if (open) this.closeButton.focus();
  }

  dispose() {
    this.unregisterPanel();
    this.unsubscribe();
    this.closeButton.removeEventListener('click', this.onClose);
    this.xButton.removeEventListener('click', this.onClose);
    this.retryButton.removeEventListener('click', this.onRetry);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    window.removeEventListener('keydown', this.onKeyDown);
    this.backdrop.remove();
  }
}
