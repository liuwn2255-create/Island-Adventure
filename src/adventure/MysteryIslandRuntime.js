export class MysteryIslandRuntime {
  constructor({ startAdventure } = {}) {
    if (typeof startAdventure !== 'function') {
      throw new TypeError('startAdventure must be a function');
    }

    this.startAdventure = startAdventure;
    this.adventure = null;
  }

  async enter(context = {}) {
    const adventure = await this.startAdventure(context.character, context.restoreData);
    this.adventure = adventure;
    return adventure;
  }

  exit() {
    const adventure = this.adventure;
    this.adventure = null;
    if (typeof adventure?.dispose === 'function') adventure.dispose();
  }
}
