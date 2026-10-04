/** Minimal UI-backed runtime for themes whose gameplay is not implemented yet. */
export class PlaceholderThemeRuntime {
  constructor({ app, createUI } = {}) {
    if (typeof createUI !== 'function') {
      throw new TypeError('createUI must be a function');
    }

    this.app = app;
    this.createUI = createUI;
    this.placeholderUI = null;
  }

  enter({ theme, onBack = () => {} } = {}) {
    this.exit();
    this.placeholderUI = this.createUI({ app: this.app, theme, onBack });
    return this.placeholderUI;
  }

  exit() {
    const placeholderUI = this.placeholderUI;
    this.placeholderUI = null;
    placeholderUI?.destroy();
  }
}
