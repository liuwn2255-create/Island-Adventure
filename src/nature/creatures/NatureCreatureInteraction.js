export class NatureCreatureInteraction {
  constructor({ app, player, creatures, interactionManager, panelCoordinator, natureGuideManager, observationUI, onObservation = () => {} }) {
    this.player = player;
    this.creatures = creatures;
    this.interactionManager = interactionManager;
    this.panelCoordinator = panelCoordinator;
    this.natureGuideManager = natureGuideManager;
    this.observationUI = observationUI;
    this.onObservation = onObservation;
    this.nearby = false;
    this.activeCreature = null;

    this.prompt = document.createElement('div');
    this.prompt.className = 'nature-creature-prompt';
    this.prompt.setAttribute('role', 'status');
    this.prompt.setAttribute('aria-live', 'polite');
    this.prompt.hidden = true;
    this.prompt.innerHTML = '<strong>🔎 發現生物</strong><span>按 <kbd>E</kbd> 觀察</span>';
    app.append(this.prompt);

    this.onKeyDown = (event) => {
      if (event.code !== 'KeyE' || event.repeat || !this.activeCreature || this.interactionManager.nearestInteractable || this.interactionManager.activeLandmark || this.interactionManager.suspended || this.panelCoordinator.activePanelId) return;
      event.preventDefault();
      const { config } = this.activeCreature;
      const firstDiscovery = this.natureGuideManager.discover(config.id);
      const entry = this.natureGuideManager.getEntry(config.id);
      if (this.observationUI.open(entry, { firstDiscovery })) this.onObservation(config.id);
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  update() {
    const regularTargetHasPriority = Boolean(this.interactionManager.nearestInteractable);
    if (this.interactionManager.suspended || this.interactionManager.activeLandmark || regularTargetHasPriority) {
      this.nearby = false;
      this.activeCreature = null;
      this.prompt.hidden = true;
      return;
    }

    const playerPosition = this.player.object3D.position;
    this.activeCreature = this.creatures
      .map((creature) => {
        const position = creature.controller.group.position;
        return {
          creature,
          distance: Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z),
        };
      })
      .filter(({ creature, distance }) => distance <= creature.config.interactionDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.creature ?? null;
    this.nearby = Boolean(this.activeCreature);
    this.prompt.hidden = !this.nearby;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.prompt.remove();
  }
}
