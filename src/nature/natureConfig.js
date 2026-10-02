import { BUTTERFLY_CONFIG } from './creatures/butterflyConfig.js';
import { FROG_CONFIG } from './creatures/frogConfig.js';

export const NATURE_ENTRIES = Object.freeze([
  Object.freeze({
    icon: '🦋',
    ...BUTTERFLY_CONFIG,
    discovered: false,
  }),
  Object.freeze({
    id: 'bird',
    name: '鳥類',
    icon: '🐦',
    category: '鳥類',
    scientificName: '',
    shortDescription: '鳥類是具有羽毛與喙的脊椎動物。',
    habitat: '森林、草原、濕地與海岸等環境',
    funFact: '不同鳥類的喙形會配合牠們的食物與生活方式。',
    image: '',
    discovered: false,
  }),
  Object.freeze({
    ...FROG_CONFIG,
    discovered: false,
  }),
]);
