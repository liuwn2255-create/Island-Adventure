import * as THREE from 'three';
import { PlayerController } from '../../player/PlayerController.js';
import { ThirdPersonCamera } from '../../camera/ThirdPersonCamera.js';
import { loadPlayerModel, PLAYER_MODEL_FORWARD_OFFSET } from '../../player/PlayerModel.js';
import { QuestManager } from '../../quests/QuestManager.js';
import { InventoryManager } from '../../items/InventoryManager.js';
import { SAVE_VERSION } from '../../save/saveConfig.js';
import { isV2SaveData } from '../../save/saveMigration.js';
import { ADVENTURE_THEMES, createThemeProgress, THEME_IDS, THEME_STATUSES } from '../../adventure/adventureConfig.js';
import { AdventureThemeCompletionManager } from '../../adventure/AdventureThemeCompletionManager.js';
import { BadgeManager } from '../../badges/BadgeManager.js';
import { PanelCoordinator } from '../../ui/PanelCoordinator.js';
import { selectQuestTarget } from '../../quests/QuestTargetSelector.js';
import { ISLAND_WALKABLE_RADIUS, PLAYER_COLLISION_RADIUS } from '../../config/gameConfig.js';
import { createMagicCastleScene } from './createMagicCastleScene.js';
import { createMagicCastleLandmarks } from './createMagicCastleLandmarks.js';
import { createMagicCastleCollectibles } from './createMagicCastleCollectibles.js';
import { MAGIC_CASTLE_QUESTS } from './magicCastleQuestConfig.js';
import { MAGIC_CASTLE_COLLECTIBLE_TYPES } from './magicCastleCollectibleConfig.js';

const MAGIC_CASTLE_BADGE = Object.freeze({
  id: 'magic-castle-explorer',
  questId: THEME_IDS.MAGIC_CASTLE,
  title: '魔法城堡探險家',
  description: '完成魔法城堡的三項主要探險任務。',
  icon: '🏰',
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

async function createDefaultInteractionManager(options) {
  const { InteractionManager } = await import('../../interaction/InteractionManager.js');
  return new InteractionManager(options);
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

function disposeObjectResources(root) {
  if (!root) return;
  const wrapper = new THREE.Scene();
  wrapper.add(root);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  wrapper.traverse((object) => {
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
  wrapper.remove(root);
}

/** Owns the Magic Castle scene and persists progress to its Save v2 theme bucket. */
export class MagicCastleRuntime {
  constructor({
    sceneFactory = createMagicCastleScene,
    rendererFactory = (options) => new THREE.WebGLRenderer(options),
    playerFactory = (scene, options) => new PlayerController(scene, options),
    cameraControllerFactory = (options) => new ThirdPersonCamera(options),
    mobileControlsFactory,
    interactionManagerFactory = createDefaultInteractionManager,
    questUIFactory,
    inventoryUIFactory,
    directionIndicatorFactory = async (options) => {
      const { ItemDirectionIndicator } = await import('../../items/ItemDirectionIndicator.js');
      return new ItemDirectionIndicator(options);
    },
    questCompletionUIFactory = createDefaultQuestCompletionUI,
    playerModelLoader = loadPlayerModel,
    clockFactory = () => new THREE.Clock(),
  } = {}) {
    Object.assign(this, { sceneFactory, rendererFactory, playerFactory, cameraControllerFactory, mobileControlsFactory, interactionManagerFactory, questUIFactory, inventoryUIFactory, directionIndicatorFactory, questCompletionUIFactory, playerModelLoader, clockFactory });
    this.isActive = false;
    this.isDisposed = true;
  }

  async enter(context = {}) {
    if (this.isActive) throw new Error('MagicCastleRuntime is already active');
    if (!context.app || !context.character || !context.saveManager || typeof context.onBack !== 'function') {
      throw new TypeError('MagicCastleRuntime requires app, character, saveManager, and onBack');
    }
    if (typeof this.mobileControlsFactory !== 'function') throw new TypeError('MagicCastleRuntime requires a mobileControlsFactory');
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
      const castle = this.sceneFactory();
      this.scene = castle.scene;
      this.ground = castle.ground;
      this.groundHeightAt = castle.groundHeightAt;
      this.cameraTarget = castle.cameraTarget;
      this.disposeCastleScene = castle.dispose;
      this.landmarks = createMagicCastleLandmarks(this.scene, this.groundHeightAt);
      this.items = createMagicCastleCollectibles(this.scene, this.groundHeightAt);
      this.questManager = new QuestManager(MAGIC_CASTLE_QUESTS);
      const castleProgress = this.getRestoreMagicCastleProgress();
      const landmarkIds = new Set(this.landmarks.map(({ id }) => id));
      const collectibleIds = new Set(this.items.map(({ id }) => id));
      const questState = castleProgress?.quests;
      const restoredCollectibleIds = [...new Set([
        ...(questState?.collectedItemIds ?? []),
        ...(castleProgress?.collections?.collectedItemIds ?? []),
      ])].filter((id) => collectibleIds.has(id));
      this.questManager.loadState({
        ...questState,
        collectedItemIds: restoredCollectibleIds,
        exploredLandmarkIds: (questState?.exploredLandmarkIds ?? []).filter((id) => landmarkIds.has(id)),
      });
      this.inventoryManager = new InventoryManager(MAGIC_CASTLE_COLLECTIBLE_TYPES);
      const inventoryCounts = Object.fromEntries(MAGIC_CASTLE_COLLECTIBLE_TYPES.map(({ id }) => [id, 0]));
      for (const item of this.items) {
        if (restoredCollectibleIds.includes(item.id)) inventoryCounts[item.type] += 1;
      }
      this.inventoryManager.loadState({ counts: inventoryCounts });

      const width = this.window.innerWidth || 1;
      const height = this.window.innerHeight || 1;
      this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
      this.camera.position.set(0, 8, 12);
      this.camera.lookAt(this.cameraTarget);
      this.renderer = this.rendererFactory({ antialias: true });
      this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
      this.cameraController = this.cameraControllerFactory({ camera: this.camera, canvas: this.renderer.domElement, player: this.player.object3D });
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
      this.playerVisual = visual;
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
      this.interactionManager.loadState({ collectedItemIds: restoredCollectibleIds });
      this.panelCoordinator = new PanelCoordinator({ interactionManager: this.interactionManager });
      if (this.questUIFactory) {
        this.questUI = await this.questUIFactory({
          app: this.app, questManager: this.questManager, panelCoordinator: this.panelCoordinator,
          showCompletionToast: false, worldName: '🏰 魔法城堡', showProgressSummary: true,
        });
      }
      if (this.inventoryUIFactory) {
        this.inventoryUI = await this.inventoryUIFactory({
          app: this.app, inventory: this.inventoryManager, panelCoordinator: this.panelCoordinator,
        });
      }
    this.directionIndicator = await this.directionIndicatorFactory({ app: this.app, player: this.player, getTarget: () => this.getDirectionTarget(), getCameraForward: () => this.cameraController.getForwardDirection() });
      this.completionEventSource = new CompletionEventSource();
      this.emptyNatureCompletionSource = new CompletionEventSource();
      this.badgeManager = new BadgeManager({ questManager: this.completionEventSource, badges: [MAGIC_CASTLE_BADGE] });
      this.badgeManager.loadState(castleProgress?.badges);
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
          if (quest.id !== THEME_IDS.MAGIC_CASTLE || !this.newlyUnlockedBadgeIds?.delete(MAGIC_CASTLE_BADGE.id)) return null;
          return this.badgeManager.getBadges().find(({ id }) => id === MAGIC_CASTLE_BADGE.id) ?? null;
        },
      });
      this.completionFeedbackTriggered = this.evaluateMagicCastleCompletion().completed;
      const shouldBackfillBadge = this.completionFeedbackTriggered && !this.badgeManager.hasBadge(MAGIC_CASTLE_BADGE.id);
      if (shouldBackfillBadge) this.badgeManager.unlockBadge(MAGIC_CASTLE_BADGE.id);
      this.unsubscribeQuestCompletion = this.questManager.subscribeCompleted(() => this.showMagicCastleCompletionIfReady());
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
    this.directionIndicator?.update();
    this.updatePositionAutosave(delta);
    this.renderer?.render(this.scene, this.camera);
  };

  getQuestSnapshot() { return this.questManager?.getSnapshot() ?? []; }

  getDirectionTarget() {
    const taskStates = this.questManager?.getSnapshot() ?? [];
    const landmarks = this.landmarks ?? [];
    const items = this.items ?? [];
    const targetsByTask = {};
    for (const task of taskStates) {
      const objective = task.objective ?? {};
      const landmarkIds = objective.landmarkIds ?? (objective.type === 'explore_landmark' || task.type === 'explore_landmark' ? landmarks.map(({ id }) => id) : []);
      const collectibleIds = objective.collectibleIds ?? (objective.type === 'collect_any' || task.type === 'collect_any' ? items.map(({ id }) => id) : []);
      const landmarkIdSet = new Set(landmarkIds);
      const collectibleIdSet = new Set(collectibleIds);
      targetsByTask[task.id] = [
        ...landmarks.filter((landmark) => landmarkIdSet.has(landmark.id) && !this.questManager.hasExploredLandmark(landmark.id))
          .map((landmark) => ({ id: landmark.id, kind: 'landmark', icon: landmark.icon ?? task.icon, name: landmark.title ?? landmark.name ?? landmark.id, position: landmark.position, interactionDistance: landmark.interactionDistance ?? 1 })),
        ...items.filter((item) => collectibleIdSet.has(item.id) && !item.collected && !this.questManager.hasCollectedItem(item.id))
          .map((item) => ({ id: item.id, kind: 'item', icon: item.icon ?? task.icon, name: item.name ?? item.id, position: item.position, interactionDistance: item.interactionDistance ?? 1 })),
      ];
    }
    const currentLockedTarget = this.lockedDirectionTarget ?? null;
    const currentLockedTargetValid = Boolean(currentLockedTarget
      && !taskStates.find(({ id }) => id === currentLockedTarget.taskId)?.completed
      && targetsByTask[currentLockedTarget.taskId]?.some(({ id }) => id === currentLockedTarget.id));
    this.lockedDirectionTarget = selectQuestTarget({ taskStates, taskPriority: taskStates.map(({ id }) => id), preferProgress: false, targetsByTask, playerPosition: this.player?.object3D?.position ?? { x: 0, z: 0 }, currentLockedTarget, currentLockedTargetValid });
    return this.lockedDirectionTarget;
  }

  getRestoreMagicCastleProgress() {
    return this.initialRestoreData?.themeProgress?.[THEME_IDS.MAGIC_CASTLE] ?? null;
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
    const previous = base.themeProgress?.[THEME_IDS.MAGIC_CASTLE] ?? this.getRestoreMagicCastleProgress() ?? {};
    const completionResult = this.evaluateMagicCastleCompletion(base.themeProgress);
    const status = completionResult.completed ? THEME_STATUSES.COMPLETED : THEME_STATUSES.IN_PROGRESS;
    const magicCastleProgress = {
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
      themeProgress: { ...base.themeProgress, [THEME_IDS.MAGIC_CASTLE]: magicCastleProgress },
    };
    return isV2SaveData(data) ? data : null;
  }

  evaluateMagicCastleCompletion(themeProgress = this.getSaveBase()?.themeProgress ?? {}) {
    return new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress,
      questSnapshot: this.questManager?.getSnapshot() ?? null,
    }).evaluateCompletion(THEME_IDS.MAGIC_CASTLE);
  }

  showMagicCastleCompletionIfReady() {
    if (this.completionFeedbackTriggered) return false;
    const result = this.evaluateMagicCastleCompletion();
    if (!result.completed) return false;
    this.completionFeedbackTriggered = true;
    if (!this.badgeManager.hasBadge(MAGIC_CASTLE_BADGE.id)) this.badgeManager.unlockBadge(MAGIC_CASTLE_BADGE.id);
    this.completionEventSource?.emit({
      id: THEME_IDS.MAGIC_CASTLE,
      title: '魔法城堡探險完成！',
      description: '「魔法城堡」的三項必要任務皆已完成。',
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
    const saved = this.getRestoreMagicCastleProgress()?.world?.player;
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
      console.warn('無法保存魔法城堡進度；仍留在魔法城堡。', error);
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
    this.window?.clearTimeout(this.movementHintTimer);
    this.movementHintTimer = null;
    this.renderer?.setAnimationLoop(null);
    if (this.onResize) this.window?.removeEventListener('resize', this.onResize);
    this.interactionManager?.dispose();
    this.unsubscribeQuestCompletion?.();
    this.unsubscribeQuestCompletion = null;
    this.questCompletionUI?.dispose();
    this.questCompletionUI = null;
    this.directionIndicator?.dispose();
    this.directionIndicator = null;
    this.lockedDirectionTarget = null;
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
    disposeObjectResources(this.playerVisual);
    this.player?.dispose();
    this.disposeCastleScene?.();
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.returnButton?.removeEventListener('click', this.onReturnClick);
    this.returnButton?.remove();
    this.movementHint?.remove();
    this.app = null;
    this.character = null;
    this.onBack = null;
    this.saveManager = null;
    this.initialRestoreData = null;
    this.saveUnavailable = false;
    this.gameState = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ground = null;
    this.groundHeightAt = null;
    this.cameraTarget = null;
    this.landmarks = null;
    this.items = null;
    this.inventoryManager = null;
    this.questManager = null;
    this.player = null;
    this.playerVisual = null;
    this.cameraController = null;
    this.mobileControls = null;
    this.interactionManager = null;
    this.clock = null;
    this.returnButton = null;
    this.movementHint = null;
    this.disposeCastleScene = null;
    this.onResize = null;
    this.window = null;
    this.document = null;
    this.lastScheduledPlayerPosition = null;
    this.positionSaveElapsed = 0;
  }
}
