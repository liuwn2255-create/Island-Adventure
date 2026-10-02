import { NATURE_QUIZZES } from './NatureQuizConfig.js';

/** Chooses questions, checks answers, and emits completed quiz attempts. */
export class NatureQuizManager {
  constructor({ natureGuideManager, quizzes = NATURE_QUIZZES, random = Math.random }) {
    this.natureGuideManager = natureGuideManager;
    this.quizzes = new Map(quizzes.map((quiz) => [quiz.speciesId, quiz]));
    this.random = random;
    this.currentQuiz = null;
    this.completionListeners = new Set();
  }

  startQuiz(speciesId) {
    const speciesQuiz = this.quizzes.get(speciesId);
    if (!speciesQuiz || !this.natureGuideManager.isDiscovered(speciesId) || speciesQuiz.questions.length === 0) return null;
    const index = Math.min(speciesQuiz.questions.length - 1, Math.floor(this.random() * speciesQuiz.questions.length));
    const question = speciesQuiz.questions[index];
    this.currentQuiz = { speciesId, speciesName: speciesQuiz.speciesName, speciesZhuyin: speciesQuiz.speciesZhuyin ?? '', source: speciesQuiz.source, question, result: null };
    return this.getCurrentQuiz();
  }

  getCurrentQuiz() {
    if (!this.currentQuiz) return null;
    return { ...this.currentQuiz };
  }

  submitAnswer(answerId) {
    if (!this.currentQuiz || this.currentQuiz.result) return null;
    const { question } = this.currentQuiz;
    if (!question.options.some((option) => option.id === answerId)) return null;
    const correct = answerId === question.correctAnswer;
    const correctOption = question.options.find((option) => option.id === question.correctAnswer);
    const result = {
      speciesId: this.currentQuiz.speciesId,
      speciesName: this.currentQuiz.speciesName,
      questionId: question.id,
      selectedAnswer: answerId,
      correctAnswer: question.correctAnswer,
      correctOptionText: correctOption.text,
      correctOptionZhuyin: correctOption.zhuyin ?? '',
      correctOptionIcon: correctOption.icon ?? '',
      correct,
      explanation: question.explanation,
      source: this.currentQuiz.source,
    };
    this.currentQuiz.result = result;
    for (const listener of this.completionListeners) listener({ ...result });
    return { ...result };
  }

  subscribeCompleted(listener) {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }
}
