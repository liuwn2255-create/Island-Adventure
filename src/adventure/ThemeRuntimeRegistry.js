export class ThemeRuntimeRegistry {
  constructor() {
    this.factories = new Map();
  }

  register(themeId, factory) {
    if (typeof themeId !== 'string' || themeId.trim().length === 0) {
      throw new TypeError('themeId must be a non-empty string');
    }
    if (typeof factory !== 'function') {
      throw new TypeError('factory must be a function');
    }

    this.factories.set(themeId, factory);
  }

  has(themeId) {
    return this.factories.has(themeId);
  }

  create(themeId, context) {
    const factory = this.factories.get(themeId);
    if (!factory) {
      throw new Error(`No runtime factory registered for theme: ${themeId}`);
    }

    return factory(context);
  }
}
