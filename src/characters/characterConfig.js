const ASSET_BASE_URL = import.meta.env?.BASE_URL ?? '/';

export const CHARACTERS = Object.freeze([
  Object.freeze({
    id: 'girl-explorer',
    name: '女孩探險家',
    modelPath: ASSET_BASE_URL + 'assets/characters/player/player.glb',
    description: '勇敢又好奇，準備好探索島嶼的每個角落。',
    displayMetadata: Object.freeze({
      description: '勇敢又好奇，準備好探索島嶼的每個角落。',
      avatarLabel: '✦',
    }),
  }),
]);
