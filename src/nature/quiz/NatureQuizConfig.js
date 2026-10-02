import { BUTTERFLY_CONFIG } from '../creatures/butterflyConfig.js';
import { FROG_CONFIG } from '../creatures/frogConfig.js';

const option = (id, text, zhuyin, icon = '') => Object.freeze({ id, text, zhuyin, icon });
const question = (id, prompt, promptZhuyin, options, correctAnswer, explanation) => Object.freeze({
  id, prompt, promptZhuyin, options: Object.freeze(options), correctAnswer, explanation,
});

// Child-friendly prompts and pronunciation guides live in data, separate from quiz UI.
export const NATURE_QUIZZES = Object.freeze([
  Object.freeze({
    speciesId: BUTTERFLY_CONFIG.id,
    speciesName: BUTTERFLY_CONFIG.name,
    speciesZhuyin: 'ㄩˋ ㄉㄞˋ ㄈㄥˋ ㄉㄧㄝˊ',
    source: BUTTERFLY_CONFIG.dataSources[0]?.url ?? '',
    questions: Object.freeze([
      question('butterfly-identify', '🦋 這是什麼？', '', [
        option('A', '玉帶鳳蝶', 'ㄩˋ ㄉㄞˋ ㄈㄥˋ ㄉㄧㄝˊ', '🦋'),
        option('B', '面天樹蛙', 'ㄇㄧㄢˋ ㄊㄧㄢ ㄕㄨˋ ㄨㄚ', '🐸'),
        option('C', '小鳥', 'ㄒㄧㄠˇ ㄋㄧㄠˇ', '🐦'),
      ], 'A', '玉帶鳳蝶是一種蝴蝶。'),
      question('butterfly-habitat', '🦋 玉帶鳳蝶喜歡在哪裡活動？', 'ㄩˋ ㄉㄞˋ ㄈㄥˋ ㄉㄧㄝˊ', [
        option('A', '林邊、路旁', 'ㄌㄧㄣˊ ㄅㄧㄢ、ㄌㄨˋ ㄆㄤˊ'),
        option('B', '深海裡', 'ㄕㄣ ㄏㄞˇ ㄌㄧˇ'),
        option('C', '冰雪裡', 'ㄅㄧㄥ ㄒㄩㄝˇ ㄌㄧˇ'),
      ], 'A', '玉帶鳳蝶常在林邊、路旁等開闊地方活動。'),
    ]),
  }),
  Object.freeze({
    speciesId: FROG_CONFIG.id,
    speciesName: FROG_CONFIG.name,
    speciesZhuyin: 'ㄇㄧㄢˋ ㄊㄧㄢ ㄕㄨˋ ㄨㄚ',
    source: FROG_CONFIG.dataSources[0]?.url ?? '',
    questions: Object.freeze([
      question('frog-identify', '🐸 這是什麼？', '', [
        option('A', '玉帶鳳蝶', 'ㄩˋ ㄉㄞˋ ㄈㄥˋ ㄉㄧㄝˊ', '🦋'),
        option('B', '面天樹蛙', 'ㄇㄧㄢˋ ㄊㄧㄢ ㄕㄨˋ ㄨㄚ', '🐸'),
        option('C', '漂亮貝殼', 'ㄆㄧㄠˋ ㄌㄧㄤˋ ㄅㄟˋ ㄎㄜˊ', '🐚'),
      ], 'B', '面天樹蛙是一種樹蛙。'),
      question('frog-habitat', '🐸 面天樹蛙喜歡什麼地方？', 'ㄇㄧㄢˋ ㄊㄧㄢ ㄕㄨˋ ㄨㄚ', [
        option('A', '潮濕、有植物的地方', 'ㄔㄠˊ ㄕ、ㄧㄡˇ ㄓˊ ㄨˋ ㄉㄜ˙ ㄉㄧˋ ㄈㄤ'),
        option('B', '乾乾的沙漠', 'ㄍㄢ ㄍㄢ ㄉㄜ˙ ㄕㄚ ㄇㄛˋ'),
        option('C', '冰冷的雪地', 'ㄅㄧㄥ ㄌㄥˇ ㄉㄜ˙ ㄒㄩㄝˇ ㄉㄧˋ'),
      ], 'A', '面天樹蛙喜歡潮濕、有植物的地方。'),
    ]),
  }),
]);
