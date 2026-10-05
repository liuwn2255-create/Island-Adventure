import * as THREE from 'three';
import { PlayerController } from '../../player/PlayerController.js';
import { ThirdPersonCamera } from '../../camera/ThirdPersonCamera.js';
import { loadPlayerModel, PLAYER_MODEL_FORWARD_OFFSET } from '../../player/PlayerModel.js';
import { INTERACTION_DISTANCE } from '../../interaction/interactionConfig.js';
import { QuestManager } from '../../quests/QuestManager.js';
import { InventoryManager } from '../../items/InventoryManager.js';
import { ISLAND_WALKABLE_RADIUS, PLAYER_COLLISION_RADIUS } from '../../config/gameConfig.js';
import { SAVE_VERSION } from '../../save/saveConfig.js';
import { isV2SaveData } from '../../save/saveMigration.js';
import { ADVENTURE_THEMES, createThemeProgress, THEME_IDS, THEME_STATUSES } from '../../adventure/adventureConfig.js';
import { AdventureThemeCompletionManager } from '../../adventure/AdventureThemeCompletionManager.js';
import { BadgeManager } from '../../badges/BadgeManager.js';
import { PanelCoordinator } from '../../ui/PanelCoordinator.js';
import { createAncientDesertScene } from './createAncientDesertScene.js';
import { createAncientDesertLandmarks } from './createAncientDesertLandmarks.js';
import { createAncientDesertCollectibles } from './createAncientDesertCollectibles.js';
import { ANCIENT_DESERT_QUESTS } from './ancientDesertQuestConfig.js';
import { ANCIENT_DESERT_COLLECTIBLE_TYPES } from './ancientDesertCollectibleConfig.js';

const ANCIENT_DESERT_BADGE = Object.freeze({
  id: 'ancient-desert-explorer',
  questId: THEME_IDS.ANCIENT_DESERT,
  title: '古文明沙漠探險家',
  description: '完成古文明沙漠的三項主要探險任務。',
  icon: '🏜️',
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
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
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

/** Runs Ancient Desert gameplay and persists only its Save v2 theme bucket. */
export class AncientDesertRuntime {
  constructor({
    sceneFactory = createAncientDesertScene,
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
  }

  async enter(context = {}) {
    if (this.isActive) throw new Error('AncientDesertRuntime is already active');
    if (!context.app || !context.character || !context.saveManager || typeof context.onBack !== 'function') {
      throw new TypeError('AncientDesertRuntime requires app, character, saveManager, and onBack');
    }
    if (typeof this.mobileControlsFactory !== 'function') {
      throw new TypeError('AncientDesertRuntime requires a mobileControlsFactory');
    }

    this.app = context.app;
    this.character = context.character;
    this.saveManager = context.saveManager;
    this.onBack = context.onBack;
    this.window = context.window ?? window;
    this.document = context.document ?? document;
    this.gameState = context.gameState ?? null;
    this.initialRestoreData = context.restoreData ?? null;
    const initialSave = this.saveManager.loadResult();
    this.saveUnavailable = !initialSave.ok && initialSave.status !== 'missing';
    if (initialSave.ok && isV2SaveData(initialSave.data)) this.initialRestoreData = initialSave.data;
    this.isActive = true;
    this.isDisposed = false;
    this.isLeaving = false;

    try {
      const desert = this.sceneFactory();
      this.scene = desert.scene;
      this.groundHeightAt = desert.groundHeightAt;
      this.disposeDesertScene = desert.dispose;
      this.cameraTarget = desert.cameraTarget;
      this.landmarks = createAncientDesertLandmarks(this.scene, this.groundHeightAt).map((landmark) => ({
        ...landmark,
        icon: '🏜️',
        interactionDistance: INTERACTION_DISTANCE,
      }));
      this.items = createAncientDesertCollectibles(this.scene, this.groundHeightAt);
      this.questManager = new QuestManager(ANCIENT_DESERT_QUESTS);
      const desertProgress = this.getRestoreAncientDesertProgress();
      const landmarkIds = new Set(this.landmarks.map(({ id }) => id));
      const collectibleIds = new Set(this.items.map(({ id }) => id));
      this.questManager.loadState({
        ...desertProgress?.quests,
        exploredLandmarkIds: (desertProgress?.quests?.exploredLandmarkIds ?? []).filter((id) => landmarkIds.has(id)),
        collectedItemIds: [...new Set([
          ...(desertProgress?.quests?.collectedItemIds ?? []),
          ...(desertProgress?.collections?.collectedItemIds ?? []),
        ])].filter((id) => collectibleIds.has(id)),
      });
      const restoredCollectibleIds = new Set([
        ...(desertProgress?.quests?.collectedItemIds ?? []),
        ...(desertProgress?.collections?.collectedItemIds ?? []),
      ].filter((id) => collectibleIds.has(id)));
      this.inventoryManager = new InventoryManager(ANCIENT_DESERT_COLLECTIBLE_TYPES);
      const inventoryCounts = Object.fromEntries(ANCIENT_DESERT_COLLECTIBLE_TYPES.map(({ id }) => [id, 0]));
      for (const item of this.items) {
        if (restoredCollectibleIds.has(item.id)) inventoryCounts[item.type] += 1;
      }
      this.inventoryManager.loadState({ counts: inventoryCounts });

      const width = this.window.innerWidth || 1;
      const height = this.window.innerHeight || 1;
      this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
      this.camera.position.set(this.cameraTarget.x, this.cameraTarget.y + 8, this.cameraTarget.z + 12);
      this.camera.lookAt(this.cameraTarget);
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
      this.interactionManager = await this.interactionManagerFactory({
        app: this.app,
        player: this.player,
        landmarks: this.landmarks,
        items: this.items,
        inventory: this.inventoryManager,
        questManager: this.questManager,
      });
      this.interactionManager.loadState({ collectedItemIds: [...restoredCollectibleIds] });
      this.panelCoordinator = new PanelCoordinator({ interactionManager: this.interactionManager });
      if (this.questUIFactory) {
        this.questUI = await this.questUIFactory({
          app: this.app, questManager: this.questManager, panelCoordinator: this.panelCoordinator,
          showCompletionToast: false, worldName: '🏜️ 古文明沙漠', showProgressSummary: true,
        });
      }
      if (this.inventoryUIFactory) {
        this.inventoryUI = await this.inventoryUIFactory({
          app: this.app, inventory: this.inventoryManager, panelCoordinator: this.panelCoordinator,
        });
      }
      this.completionEventSource = new CompletionEventSource();
      this.emptyNatureCompletionSource = new CompletionEventSource();
      this.badgeManager = new BadgeManager({
        questManager: this.completionEventSource,
        badges: [ANCIENT_DESERT_BADGE],
      });
      this.badgeManager.loadState(desertProgress?.badges);
      this.newlyUnlockedBadgeIds = new Set();
      let previousUnlockedBadgeIds = new Set(this.badgeManager.getBadges().map(({ id }) => id));
      this.unsubscribeBadgeState = this.badgeManager.subscribe((badges) => {
        const unlockedIds = new Set(badges.map(({ id }) => id));
        for (const id of unlockedIds) if (!previousUnlockedBadgeIds.has(id)) this.newlyUnlockedBadgeIds.add(id);
        previousUnlockedBadgeIds = unlockedIds;
      });
      this.questCompletionUI = await this.questCompletionUIFactory({
        app: this.app,
        panelCoordinator: this.panelCoordinator,
        interactionManager: this.interactionManager,
        questManager: this.completionEventSource,
        natureQuestManager: this.emptyNatureCompletionSource,
        getBadgeForCompletion: (quest) => {
          if (quest.id !== THEME_IDS.ANCIENT_DESERT || !this.newlyUnlockedBadgeIds?.delete(ANCIENT_DESERT_BADGE.id)) return null;
          return this.badgeManager.getBadges().find(({ id }) => id === ANCIENT_DESERT_BADGE.id) ?? null;
        },
      });
      this.completionFeedbackTriggered = this.evaluateAncientDesertCompletion().completed;
      const shouldBackfillBadge = this.completionFeedbackTriggered && !this.badgeManager.hasBadge(ANCIENT_DESERT_BADGE.id);
      if (shouldBackfillBadge) this.badgeManager.unlockBadge(ANCIENT_DESERT_BADGE.id);
      this.unsubscribeQuestCompletion = this.questManager.subscribeCompleted(() => this.showAncientDesertCompletionIfReady());
      this.createReturnButton();
      this.createMovementHint();
      this.gameState?.set?.('PLAYING');
      this.clock = this.clockFactory();
      this.positionSaveElapsed = 0;
      this.lastScheduledPlayerPosition = this.player.object3D.position.clone();
      this.setupAutosave();
      if (shouldBackfillBadge) this.scheduleSave();
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
    this.updatePositionAutosave(delta);
    this.renderer?.render(this.scene, this.camera);
  };

  getRestoreAncientDesertProgress() {
    return this.initialRestoreData?.themeProgress?.[THEME_IDS.ANCIENT_DESERT] ?? null;
  }

  getSaveBase() {
    const latest = this.saveManager.loadResult();
    if (latest.ok && isV2SaveData(latest.data)) return latest.data;
    if (latest.status !== 'missing' || this.saveUnavailable) return null;
    if (isV2SaveData(this.initialRestoreData)) return this.initialRestoreData;
    if (this.character?.id) return createInitialSaveData(this.character.id);
    return null;
  }

  getSaveData() {
    const base = this.getSaveBase();
    if (!base || !this.player || !this.questManager || !this.interactionManager) return null;
    const previous = base.themeProgress?.[THEME_IDS.ANCIENT_DESERT] ?? this.getRestoreAncientDesertProgress() ?? {};
    const completionResult = this.evaluateAncientDesertCompletion(base.themeProgress);
    const status = completionResult.completed ? THEME_STATUSES.COMPLETED : THEME_STATUSES.IN_PROGRESS;
    const ancientDesertProgress = {
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
      themeProgress: { ...base.themeProgress, [THEME_IDS.ANCIENT_DESERT]: ancientDesertProgress },
    };
    return isV2SaveData(data) ? data : null;
  }

  evaluateAncientDesertCompletion(themeProgress = this.getSaveBase()?.themeProgress ?? {}) {
    return new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress,
      questSnapshot: this.questManager?.getSnapshot() ?? null,
    }).evaluateCompletion(THEME_IDS.ANCIENT_DESERT);
  }

  showAncientDesertCompletionIfReady() {
    if (this.completionFeedbackTriggered) return false;
    const result = this.evaluateAncientDesertCompletion();
    if (!result.completed) return false;
    this.completionFeedbackTriggered = true;
    this.completionEventSource?.emit({
      id: THEME_IDS.ANCIENT_DESERT,
      title: '古文明沙漠探險完成！',
      description: '「古文明沙漠」的三項必要任務皆已完成。',
      completed: true,
    });
    return true;
  }

  setupAutosave() {
    this.unsubscribeQuestSave = this.questManager.subscribe((quests) => {
      if (quests.some(({ progress, completed }) => progress > 0 || completed)) this.scheduleSave();
    });
  }

  scheduleSave() {
    if (this.saveUnavailable) return false;
    this.saveManager.scheduleSave(() => this.getSaveData());
    return true;
  }

  restoreWorldPosition() {
    const saved = this.getRestoreAncientDesertProgress()?.world?.player;
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.z)) return;
    const maxRadius = ISLAND_WALKABLE_RADIUS - PLAYER_COLLISION_RADIUS;
    if (Math.hypot(saved.x, saved.z) > maxRadius) return;
    this.player.object3D.position.set(saved.x, this.groundHeightAt(saved.x, saved.z), saved.z);
    if (Number.isFinite(saved.rotationY)) this.player.object3D.rotation.y = saved.rotationY;
  }

  updatePositionAutosave(delta) {
    if (!this.player || !this.lastScheduledPlayerPosition) return;
    this.positionSaveElapsed += delta;
    const position = this.player.object3D.position;
    if (position.distanceTo(this.lastScheduledPlayerPosition) < 0.5 || this.positionSaveElapsed < 1) return;
    this.positionSaveElapsed = 0;
    this.lastScheduledPlayerPosition.copy(position);
    this.scheduleSave();
  }

  getQuestSnapshot() {
    return this.questManager?.getSnapshot() ?? [];
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
    } catch (error) {
      console.warn('無法保存古文明沙漠進度；仍留在沙漠。', error);
      this.isLeaving = false;
      if (this.returnButton) this.returnButton.disabled = false;
      return false;
    }
    const onBack = this.onBack;
    this.exit();
    onBack?.();
    return true;
  }

  exit() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isActive = false;
    this.isLeaving = false;
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
    if (this.disposeDesertScene) this.disposeDesertScene();
    else disposeSceneResources(this.scene);
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.returnButton?.removeEventListener('click', this.onReturnClick);
    this.returnButton?.remove();
    this.returnButton = null;
    this.clock = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.cameraController = null;
    this.mobileControls = null;
    this.interactionManager = null;
    this.items = null;
    this.inventoryManager = null;
    this.landmarks = null;
    this.questManager = null;
    this.saveManager = null;
    this.initialRestoreData = null;
    this.saveUnavailable = false;
    this.cameraTarget = null;
    this.groundHeightAt = null;
    this.disposeDesertScene = null;
    this.onResize = null;
    this.app = null;
    this.character = null;
    this.onBack = null;
    this.gameState = null;
    this.lastScheduledPlayerPosition = null;
  }
}
