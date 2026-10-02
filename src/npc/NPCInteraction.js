/** Connects the patrolling NPC to the shared nearest-target E interaction. */
export class NPCInteraction {
  constructor({ npcManager, dialogUI }) {
    this.npcManager = npcManager;
    this.dialogUI = dialogUI;
    this.interactable = npcManager.getInteractable(() => dialogUI.open());
  }

  getInteractables() { return [this.interactable]; }

  dispose() { this.interactable = null; }
}
