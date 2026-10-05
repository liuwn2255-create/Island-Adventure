import * as THREE from 'three';
import { PlayerController } from '../../player/PlayerController.js';
import { ThirdPersonCamera } from '../../camera/ThirdPersonCamera.js';
import { loadPlayerModel, PLAYER_MODEL_FORWARD_OFFSET } from '../../player/PlayerModel.js';
import { ISLAND_WALKABLE_RADIUS, PLAYER_COLLISION_RADIUS } from '../../config/gameConfig.js';
import { QuestManager } from '../../quests/QuestManager.js';
import { InventoryManager } from '../../items/InventoryManager.js';
import { SAVE_VERSION } from '../../save/saveConfig.js';
import { isV2SaveData } from '../../save/saveMigration.js';
import { ADVENTURE_THEMES, createThemeProgress, THEME_IDS, THEME_STATUSES } from '../../adventure/adventureConfig.js';
import { AdventureThemeCompletionManager } from '../../adventure/AdventureThemeCompletionManager.js';
import { PanelCoordinator } from '../../ui/PanelCoordinator.js';
import { createOceanScene } from './createOceanScene.js';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { SaveManager } from '../../save/SaveManager.js';
import { BadgeManager } from '../../badges/BadgeManager.js';
import { BADGES } from '../../badges/badgeConfig.js';
import { OCEAN_COLLECTIBLES, OCEAN_COLLECTIBLE_TYPES, OCEAN_LANDMARKS, OCEAN_QUESTS, OCEAN_THEME } from './oceanConfig.js';

const OCEAN_BADGE = Object.freeze({
  id: 'ocean-explorer',
  questId: THEME_IDS.OCEAN,
  title: '深海探險家',
  description: '完成深海世界的三項主要探險任務。',
  icon: '🌊',
});

class CompletionEventSource {
  constructor() { this.listeners = new Set(); }
  subscribeCompleted(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(quest) {
    for (const listener of this.listeners) listener(quest);
  }
}

async function createDefaultQuestCompletionUI(options) {
  const { QuestCompletionUI } = await import('../../ui/QuestCompletionUI.js');
  return new QuestCompletionUI(options);
}

function createInitialSaveData(characterId) {
  const islandProgress = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) islandProgress[field] = {};
  return {
    version: SAVE_VERSION,
    characterId,
    themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: islandProgress },
  };
}

async function createDefaultInteractionManager(options) {
  const { InteractionManager } = await import('../../interaction/InteractionManager.js');
  return new InteractionManager(options);
}

function disposeSceneResources(scene) {
  if (!scene) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

function disposeObjectResources(root) {
  if (!root) return;
  const wrapper = new THREE.Scene();
  wrapper.add(root);
  disposeSceneResources(wrapper);
  wrapper.remove(root);
}

/** Owns the Ocean scene and landmark-interaction lifecycle without save systems. */
export class OceanRuntime {
  constructor({
    sceneFactory = createOceanScene,
    rendererFactory = (options) => new THREE.WebGLRenderer(options),
    playerFactory = (scene, options) => new PlayerController(scene, options),
    cameraControllerFactory = (options) => new ThirdPersonCamera(options),
    mobileControlsFactory,
    interactionManagerFactory = createDefaultInteractionManager,
    questUIFactory,
    inventoryUIFactory,
    questCompletionUIFactory = createDefaultQuestCompletionUI,
    playerModelLoader = loadPlayerModel,
    clockFactory = () => new THREE.Clock(),
  } = {}) {
    this.sceneFactory = sceneFactory;
    this.rendererFactory = rendererFactory;
    this.playerFactory = playerFactory;
    this.cameraControllerFactory = cameraControllerFactory;
    this.mobileControlsFactory = mobileControlsFactory;
    this.interactionManagerFactory = interactionManagerFactory;
    this.questUIFactory = questUIFactory;
    this.inventoryUIFactory = inventoryUIFactory;
    this.questCompletionUIFactory = questCompletionUIFactory;
    this.playerModelLoader = playerModelLoader;
    this.clockFactory = clockFactory;
    this.isActive = false;
    this.isDisposed = true;
    this.isLeaving = false;
  }

  async enter(context = {}) {
    if (this.isActive) throw new Error('OceanRuntime is already active');
    if (!context.app || !context.character || !context.saveManager || typeof context.onBack !== 'function') {
      throw new TypeError('OceanRuntime requires app, character, saveManager, and onBack');
    }
    if (typeof this.mobileControlsFactory !== 'function') {
      throw new TypeError('OceanRuntime requires a mobileControlsFactory');
    }

    this.app = context.app;
    this.character = context.character;
    this.saveManager = context.saveManager;
    this.onBack = context.onBack;
    this.window = context.window ?? window;
    this.document = context.document ?? document;
    this.initialRestoreData = context.restoreData ?? null;
    this.isActive = true;
    this.isDisposed = false;

    try {
      const ocean = this.sceneFactory();
      this.scene = ocean.scene;
      this.groundHeightAt = ocean.groundHeightAt;
      this.landmarks = ocean.landmarks;
      const expectedLandmarkIds = new Set(OCEAN_LANDMARKS.map(({ id }) => id));
      if (!Array.isArray(this.landmarks)
        || this.landmarks.length !== expectedLandmarkIds.size
        || this.landmarks.some(({ id, object3D }) => !expectedLandmarkIds.has(id) || !object3D)) {
        throw new Error('Ocean scene must provide all configured Ocean landmarks');
      }
      this.items = createCollectibleItems(
        this.scene,
        this.groundHeightAt,
        OCEAN_COLLECTIBLES,
        OCEAN_COLLECTIBLE_TYPES,
      );

      const width = this.window.innerWidth || 1;
      const height = this.window.innerHeight || 1;
      this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
      this.camera.position.set(0, 8, 12);
      this.camera.lookAt(ocean.cameraTarget);
      this.renderer = this.rendererFactory({ antialias: true });
      this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.app.appendChild(this.renderer.domElement);

      this.onResize = () => {
        const nextWidth = this.window.innerWidth || 1;
        const nextHeight = this.window.innerHeight || 1;
        this.camera.aspect = nextWidth / nextHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(nextWidth, nextHeight);
        this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 2));
      };
      this.window.addEventListener('resize', this.onResize);

      this.player = this.playerFactory(this.scene, {
        groundHeightAt: this.groundHeightAt,
        getCameraForward: () => this.cameraController.getForwardDirection(),
      });
      this.player.enabled = false;
      this.restoreWorldPosition();
      this.cameraController = this.cameraControllerFactory({
        camera: this.camera,
        canvas: this.renderer.domElement,
        player: this.player.object3D,
      });
      this.mobileControls = await this.mobileControlsFactory({
        app: this.app,
        canvas: this.renderer.domElement,
        player: this.player,
        onCameraChange: (deltaX, deltaY) => this.cameraController.rotateBy(deltaX, deltaY),
      });

      const visual = await this.playerModelLoader(this.character.modelPath, { yawOffset: PLAYER_MODEL_FORWARD_OFFSET });
      if (this.isDisposed) {
        disposeObjectResources(visual);
        return this;
      }
      this.player.object3D.add(visual);
      this.player.enabled = true;
      const oceanProgress = this.getRestoreOceanProgress();
      this.questManager = new QuestManager(OCEAN_QUESTS);
      this.questManager.loadState(oceanProgress?.quests);
      const knownLandmarkIds = new Set(this.landmarks.map(({ id }) => id));
      this.exploredLandmarkIds = new Set(
        (oceanProgress?.quests?.exploredLandmarkIds ?? []).filter((id) => knownLandmarkIds.has(id)),
      );
      this.inventoryManager = new InventoryManager(OCEAN_COLLECTIBLE_TYPES);
      const restoredCollections = new Set([
        ...(oceanProgress?.collections?.collectedItemIds ?? []),
        ...(oceanProgress?.quests?.collectedItemIds ?? []),
      ]);
      const inventoryCounts = Object.fromEntries(OCEAN_COLLECTIBLE_TYPES.map(({ id }) => [id, 0]));
      for (const item of this.items) {
        if (restoredCollections.has(item.id)) inventoryCounts[item.type] += 1;
      }
      this.inventoryManager.loadState({ counts: inventoryCounts });
      this.interactionManager = await this.interactionManagerFactory({
        app: this.app,
        player: this.player,
        landmarks: this.landmarks,
        items: this.items,
        inventory: this.inventoryManager,
        questManager: this.questManager,
      });
      this.interactionManager.loadState({ collectedItemIds: [...restoredCollections] });
      this.collectedItemIds = new Set(this.items.filter(({ collected }) => collected).map(({ id }) => id));
      this.panelCoordinator = new PanelCoordinator({ interactionManager: this.interactionManager });
      if (this.questUIFactory) {
        this.questUI = await this.questUIFactory({
          app: this.app, questManager: this.questManager, panelCoordinator: this.panelCoordinator,
          showCompletionToast: false, worldName: '🌊 深海探險', showProgressSummary: true,
        });
      }
      if (this.inventoryUIFactory) {
        this.inventoryUI = await this.inventoryUIFactory({
          app: this.app, inventory: this.inventoryManager, panelCoordinator: this.panelCoordinator,
        });
      }
      this.completionEventSource = new CompletionEventSource();
      this.emptyNatureCompletionSource = new CompletionEventSource();
      this.oceanBadge = BADGES.find(({ id }) => id === OCEAN_BADGE.id) ?? OCEAN_BADGE;
      this.badgeManager = new BadgeManager({
        questManager: this.completionEventSource,
        badges: this.oceanBadge ? [this.oceanBadge] : [],
      });
      this.badgeManager.loadState(oceanProgress?.badges);
      this.newlyUnlockedBadgeIds = new Set();
      let unlockedBadgeIds = new Set(this.badgeManager.getBadges().map(({ id }) => id));
      this.unsubscribeBadgeState = this.badgeManager.subscribe((badges) => {
        const nextIds = new Set(badges.map(({ id }) => id));
        for (const id of nextIds) if (!unlockedBadgeIds.has(id)) this.newlyUnlockedBadgeIds.add(id);
        unlockedBadgeIds = nextIds;
      });
      this.questCompletionUI = await this.questCompletionUIFactory({
        app: this.app,
        panelCoordinator: this.panelCoordinator,
        interactionManager: this.interactionManager,
        questManager: this.completionEventSource,
        natureQuestManager: this.emptyNatureCompletionSource,
        getBadgeForCompletion: (quest) => {
          if (quest.id !== THEME_IDS.OCEAN || !this.newlyUnlockedBadgeIds?.delete(this.oceanBadge?.id)) return null;
          return this.badgeManager.getBadges().find(({ id }) => id === this.oceanBadge.id) ?? null;
        },
      });
      this.completionFeedbackTriggered = this.evaluateOceanCompletion().completed;
      this.unsubscribeQuestCompletion = this.questManager.subscribeCompleted(() => this.showOceanCompletionIfReady());
      this.setupAutosave();
      this.createReturnButton();
      this.createMovementHint();
      context.gameState?.set?.('PLAYING');
      this.clock = this.clockFactory();
      this.renderer.setAnimationLoop(this.frame);
      return this;
    } catch (error) {
      this.exit();
      throw error;
    }
  }

  createReturnButton() {
    this.returnButton = this.document.createElement('button');
    this.returnButton.className = 'home-toggle';
    this.returnButton.type = 'button';
    this.returnButton.textContent = '🌎 冒險世界';
    this.returnButton.setAttribute('aria-label', '返回冒險世界');
    this.onReturnClick = () => this.returnToAdventureWorld();
    this.returnButton.addEventListener('click', this.onReturnClick);
    this.app.appendChild(this.returnButton);
  }

  createMovementHint() {
    this.movementHint = this.document.createElement('div');
    this.movementHint.id = 'status';
    this.movementHint.setAttribute('role', 'status');
    this.movementHint.textContent = 'W / A / S / D 移動';
    this.movementHint.style.top = '68px';
    this.movementHint.style.bottom = 'auto';
    this.app.appendChild(this.movementHint);
    this.movementHintTimer = this.window.setTimeout(() => {
      this.movementHint?.classList.add('hidden');
      this.movementHintTimer = null;
    }, 1800);
  }

  frame = () => {
    if (!this.isActive || this.isDisposed) return;
    const delta = Math.min(this.clock?.getDelta?.() ?? 1 / 60, 0.1);
    this.player?.update(delta);
    this.cameraController?.update(delta);
    this.interactionManager?.update();
    this.questCompletionUI?.update();
    for (const item of this.items ?? []) {
      if (item.collected) this.collectedItemIds?.add(item.id);
    }
    const activeLandmarkId = this.interactionManager?.activeLandmark?.id;
    if (activeLandmarkId && this.landmarks?.some(({ id }) => id === activeLandmarkId)) {
      this.exploredLandmarkIds.add(activeLandmarkId);
    }
    this.renderer?.render(this.scene, this.camera);
  };

  getExploredLandmarkIds() {
    return [...(this.exploredLandmarkIds ?? [])];
  }

  getCollectedItemIds() {
    return [...(this.collectedItemIds ?? [])];
  }

  getQuestSnapshot() {
    return this.questManager?.getSnapshot() ?? [];
  }

  evaluateOceanCompletion(themeProgress = this.getSaveBase()?.themeProgress ?? {}) {
    return new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress,
      questSnapshot: this.questManager?.getSnapshot() ?? null,
    }).evaluateCompletion(THEME_IDS.OCEAN);
  }

  showOceanCompletionIfReady() {
    if (this.completionFeedbackTriggered) return false;
    const result = this.evaluateOceanCompletion();
    if (!result.completed) return false;
    this.completionFeedbackTriggered = true;
    this.completionEventSource?.emit({
      id: THEME_IDS.OCEAN,
      title: `${OCEAN_THEME.name}已完成！`,
      description: `「${OCEAN_THEME.name}」的三項必要任務皆已完成。`,
      completed: true,
    });
    return true;
  }

  getRestoreOceanProgress() {
    return this.initialRestoreData?.themeProgress?.[THEME_IDS.OCEAN] ?? null;
  }

  getSaveBase() {
    const latest = this.saveManager.loadResult();
    if (latest.ok && isV2SaveData(latest.data)) return latest.data;
    if (latest.status !== 'missing') return null;
    if (isV2SaveData(this.initialRestoreData)) return this.initialRestoreData;
    if (this.character?.id) return createInitialSaveData(this.character.id);
    return null;
  }

  getSaveData() {
    const base = this.getSaveBase();
    if (!base || !this.player || !this.questManager || !this.interactionManager) return null;
    const previous = base.themeProgress?.[THEME_IDS.OCEAN] ?? this.getRestoreOceanProgress() ?? {};
    const completionResult = this.evaluateOceanCompletion(base.themeProgress);
    const status = completionResult.completed ? THEME_STATUSES.COMPLETED : THEME_STATUSES.IN_PROGRESS;
    const oceanProgress = {
      ...createThemeProgress(status),
      ...previous,
      status,
      quests: this.questManager.saveState(),
      collections: {
        ...(previous.collections ?? {}),
        ...this.interactionManager.saveState(),
      },
      badges: this.badgeManager?.saveState() ?? previous.badges ?? null,
      world: {
        ...(previous.world ?? {}),
        player: {
          x: this.player.object3D.position.x,
          z: this.player.object3D.position.z,
          rotationY: this.player.object3D.rotation.y,
        },
      },
      completion: completionResult.completed ? completionResult.completion : null,
    };
    const data = {
      ...base,
      version: SAVE_VERSION,
      characterId: base.characterId || this.character.id,
      themeProgress: { ...base.themeProgress, [THEME_IDS.OCEAN]: oceanProgress },
    };
    return isV2SaveData(data) ? data : null;
  }

  setupAutosave() {
    this.unsubscribeQuestSave = this.questManager.subscribe((quests) => {
      if (quests.some(({ progress, completed }) => progress > 0 || completed)) this.scheduleSave();
    });
  }

  scheduleSave() {
    this.saveManager.scheduleSave(() => this.getSaveData());
  }

  restoreWorldPosition() {
    const saved = this.getRestoreOceanProgress()?.world?.player;
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.z)) return;
    const maxRadius = ISLAND_WALKABLE_RADIUS - PLAYER_COLLISION_RADIUS;
    if (Math.hypot(saved.x, saved.z) > maxRadius) return;
    this.player.object3D.position.set(saved.x, this.groundHeightAt(saved.x, saved.z), saved.z);
    if (Number.isFinite(saved.rotationY)) this.player.object3D.rotation.y = saved.rotationY;
  }

  returnToAdventureWorld() {
    if (!this.isActive || this.isLeaving) return false;
    this.isLeaving = true;
    if (this.returnButton) this.returnButton.disabled = true;
    try {
      this.saveManager.flush();
      const data = this.getSaveData();
      if (!data || this.saveManager.save(data) !== true) {
        this.isLeaving = false;
        if (this.returnButton) this.returnButton.disabled = false;
        return false;
      }
      const onBack = this.onBack;
      this.exit();
      onBack?.();
      return true;
    } catch (error) {
      console.warn('無法保存 Ocean 探險進度；仍留在 Ocean。', error);
      this.isLeaving = false;
      if (this.returnButton) this.returnButton.disabled = false;
      return false;
    }
  }

  exit() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isActive = false;
    this.window?.clearTimeout(this.movementHintTimer);
    this.movementHintTimer = null;
    this.movementHint?.remove();
    this.movementHint = null;
    this.renderer?.setAnimationLoop(null);
    if (this.onResize) this.window?.removeEventListener('resize', this.onResize);
    this.interactionManager?.dispose();
    this.unsubscribeQuestCompletion?.();
    this.unsubscribeQuestCompletion = null;
    this.questCompletionUI?.dispose();
    this.questCompletionUI = null;
    this.questUI?.dispose();
    this.questUI = null;
    this.inventoryUI?.dispose();
    this.inventoryUI = null;
    this.unsubscribeBadgeState?.();
    this.unsubscribeBadgeState = null;
    this.badgeManager?.dispose();
    this.badgeManager = null;
    this.newlyUnlockedBadgeIds?.clear();
    this.newlyUnlockedBadgeIds = null;
    this.oceanBadge = null;
    this.panelCoordinator?.dispose();
    this.panelCoordinator = null;
    this.completionEventSource = null;
    this.emptyNatureCompletionSource = null;
    this.completionFeedbackTriggered = false;
    this.unsubscribeQuestSave?.();
    this.unsubscribeQuestSave = null;
    this.mobileControls?.dispose();
    this.cameraController?.dispose();
    this.player?.dispose();
    disposeSceneResources(this.scene);
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.returnButton?.removeEventListener('click', this.onReturnClick);
    this.returnButton?.remove();
    this.clock = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.cameraController = null;
    this.mobileControls = null;
    this.interactionManager = null;
    this.items = null;
    this.questManager = null;
    this.saveManager = null;
    this.initialRestoreData = null;
    this.collectedItemIds?.clear();
    this.collectedItemIds = null;
    this.inventoryManager = null;
    this.exploredLandmarkIds?.clear();
    this.exploredLandmarkIds = null;
    this.landmarks = null;
    this.context = null;
    this.app = null;
    this.character = null;
    this.onBack = null;
  }
}
