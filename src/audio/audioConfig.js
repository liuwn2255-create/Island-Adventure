export const AUDIO_CONFIG = Object.freeze({
  defaultVolumes: Object.freeze({ master: 0.72, music: 0.12, environment: 0.2, sfx: 0.32 }),
  futureSources: Object.freeze({
    music: Object.freeze({ exploration: '/audio/music/exploration.ogg' }),
    environment: Object.freeze({ wind: '/audio/environment/wind.ogg', ocean: '/audio/environment/ocean.ogg' }),
    sfx: Object.freeze({
      collect: '/audio/sfx/collect.ogg',
      discover: '/audio/sfx/discover.ogg',
      openGuide: '/audio/sfx/open-guide.ogg',
      questComplete: '/audio/sfx/quest-complete.ogg',
      badgeUnlock: '/audio/sfx/badge-unlock.ogg',
    }),
  }),
});

export const SFX_NAMES = Object.freeze(['collect', 'discover', 'openGuide', 'questComplete', 'badgeUnlock']);
