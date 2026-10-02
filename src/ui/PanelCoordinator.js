/** Keeps inventory, quests, badges, and the nature guide mutually exclusive. */
export class PanelCoordinator {
  constructor({ interactionManager }) {
    this.interactionManager = interactionManager;
    this.panels = new Map();
    this.activePanelId = null;
  }

  register(id, onOpenChange) {
    this.panels.set(id, onOpenChange);
    return () => {
      if (this.activePanelId === id) this.close(id);
      this.panels.delete(id);
    };
  }

  toggle(id) {
    if (this.activePanelId === id) return this.close(id);
    return this.open(id);
  }

  open(id) {
    const nextPanel = this.panels.get(id);
    if (!nextPanel || this.interactionManager.activeLandmark) return false;
    if (this.activePanelId === id) return true;

    if (this.activePanelId) this.panels.get(this.activePanelId)?.(false);
    else this.interactionManager.setSuspended(true);

    this.activePanelId = id;
    nextPanel(true);
    return true;
  }

  close(id) {
    if (this.activePanelId !== id) return false;
    this.panels.get(id)?.(false);
    this.activePanelId = null;
    this.interactionManager.setSuspended(false);
    return true;
  }

  dispose() {
    if (this.activePanelId) this.close(this.activePanelId);
    this.panels.clear();
  }
}
