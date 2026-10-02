export const NATURE_QUEST_SPECIES_IDS = Object.freeze(['butterfly', 'taiwan-tree-frog']);

export const NATURE_QUESTS = Object.freeze([
  Object.freeze({ id: 'discover-life', icon: '🦋', title: '發現自然', description: '發現 2 種不同的自然生物', target: 2, progressType: 'discoveries' }),
  Object.freeze({ id: 'nature-observer', icon: '🔎', title: '自然觀察家', description: '完成 2 次生物觀察', target: 2, progressType: 'observations' }),
  Object.freeze({ id: 'nature-learner', icon: '🧠', title: '自然學習家', description: '答對 2 次自然小測驗', target: 2, progressType: 'correctAnswers' }),
  Object.freeze({ id: 'nature-guide', icon: '📖', title: '自然圖鑑收藏家', description: '在自然圖鑑發現 2 種生物', target: 2, progressType: 'discoveries' }),
]);
