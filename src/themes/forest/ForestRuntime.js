import * as THREE from 'three';
import {
  ISLAND_WALKABLE_RADIUS,
  PLAYER_COLLISION_RADIUS,
  PLAYER_START_POSITION,
} from '../../config/gameConfig.js';
import { InventoryManager } from '../../items/InventoryManager.js';
import { createCollectibleItems } from '../../items/createCollectibleItems.js';
import { PlayerController } from '../../player/PlayerController.js';
import { ThirdPersonCamera } from '../../camera/ThirdPersonCamera.js';
import { loadPlayerModel, PLAYER_MODEL_FORWARD_OFFSET } from '../../player/PlayerModel.js';
import { QuestManager } from '../../quests/QuestManager.js';
import { selectQuestTarget } from '../../quests/QuestTargetSelector.js';
import { PanelCoordinator } from '../../ui/PanelCoordinator.js';
import { SaveManager } from '../../save/SaveManager.js';
import { SAVE_VERSION } from '../../save/saveConfig.js';
import { isV2SaveData } from '../../save/saveMigration.js';
import {
  ADVENTURE_THEMES,
  createThemeProgress,
  THEME_IDS,
  THEME_STATUSES,
} from '../../adventure/adventureConfig.js';
import { AdventureThemeCompletionManager } from '../../adventure/AdventureThemeCompletionManager.js';
import { FOREST_COLLECTIBLE_TYPES, FOREST_COLLECTIBLES, FOREST_QUESTS } from './forestConfig.js';
import { FOREST_COLLECTIBLE_VISUAL_BUILDERS } from './createForestCollectibleVisuals.js';
import { createForestScene } from './createForestScene.js';

function createInitialSaveData(characterId) {
  const mysteryIsland = createThemeProgress(THEME_STATUSES.AVAILABLE);
  for (const field of ['inventory', 'quests', 'badges', 'nature', 'world']) mysteryIsland[field] = {};
  return {
    version: SAVE_VERSION,
    characterId,
    themeProgress: { [THEME_IDS.MYSTERY_ISLAND]: mysteryIsland },
  };
}

function getForestInventoryRestoreState(progress) {
  const inventory = progress?.inventory;
  const savedCounts = inventory?.counts;
  if (!savedCounts || FOREST_COLLECTIBLE_TYPES.some(({ id }) => Object.hasOwn(savedCounts, id))) return inventory;

  // Older Forest saves counted shared Island item types. Stable collectible IDs
  // let us rebuild those counts using the new Forest-specific type IDs.
  const collectedIds = new Set(progress?.collections?.collectedItemIds ?? []);
  if (collectedIds.size === 0) return inventory;
  const counts = Object.fromEntries(FOREST_COLLECTIBLE_TYPES.map(({ id }) => [id, 0]));
  for (const spawn of FOREST_COLLECTIBLES) {
    if (collectedIds.has(spawn.id)) counts[spawn.type] += 1;
  }
  return { ...inventory, counts };
}

function disposeSceneResources(scene) {
  if (!scene) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
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

/** Owns the Forest scene lifecycle while reusing the existing player and interaction systems. */
export class ForestRuntime {
  constructor({
    sceneFactory = createForestScene,
    rendererFactory = (options) => new THREE.WebGLRenderer(options),
    playerModelLoader = loadPlayerModel,
    interactionManagerFactory,
    mobileControlsFactory,
    questUIFactory,
    inventoryUIFactory,
    directionIndicatorFactory = async (options) => {
      const { ItemDirectionIndicator } = await import('../../items/ItemDirectionIndicator.js');
      return new ItemDirectionIndicator(options);
    },
  } = {}) {
    this.sceneFactory = sceneFactory;
    this.rendererFactory = rendererFactory;
    this.playerModelLoader = playerModelLoader;
    this.interactionManagerFactory = interactionManagerFactory;
    this.mobileControlsFactory = mobileControlsFactory;
    this.questUIFactory = questUIFactory;
    this.inventoryUIFactory = inventoryUIFactory;
    this.directionIndicatorFactory = directionIndicatorFactory;
    this.isActive = false;
    this.isDisposed = true;
    this.isLeaving = false;
  }

  async enter(context = {}) {
    if (this.isActive) throw new Error('ForestRuntime is already active');
    if (!context.app || !context.character || !context.saveManager || typeof context.onBack !== 'function'
      || typeof this.interactionManagerFactory !== 'function'
      || typeof this.mobileControlsFactory !== 'function'
      || typeof this.questUIFactory !== 'function'
      || typeof this.inventoryUIFactory !== 'function') {
      throw new TypeError('ForestRuntime requires app, character, saveManager, onBack, and UI factories');
    }

    this.context = context;
    this.app = context.app;
    this.character = context.character;
    this.saveManager = context.saveManager;
    this.onBack = context.onBack;
    this.window = context.window ?? window;
    this.document = context.document ?? document;
    this.gameState = context.gameState ?? null;
    this.initialRestoreData = context.restoreData ?? null;
    this.isDisposed = false;
    this.isActive = true;
    this.unsubscribers = [];

    try {
      const forest = this.sceneFactory();
      this.scene = forest.scene;
      this.groundHeightAt = forest.groundHeightAt;
      this.landmarks = forest.landmarks;
      const width = this.window.innerWidth || 1;
      const height = this.window.innerHeight || 1;
      this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150);
      this.camera.position.set(0, 8, 12);
      this.camera.lookAt(forest.cameraTarget);
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

      this.player = new PlayerController(this.scene, {
        groundHeightAt: this.groundHeightAt,
        getCameraForward: () => this.cameraController.getForwardDirection(),
      });
      this.player.enabled = false;
      this.restoreWorldPosition();
      this.cameraController = new ThirdPersonCamera({
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

      this.items = createCollectibleItems(this.scene, this.groundHeightAt, FOREST_COLLECTIBLES, FOREST_COLLECTIBLE_TYPES, FOREST_COLLECTIBLE_VISUAL_BUILDERS);
      this.inventoryManager = new InventoryManager(FOREST_COLLECTIBLE_TYPES);
      const forestProgress = this.getRestoreForestProgress();
      this.inventoryManager.loadState(getForestInventoryRestoreState(forestProgress));
      this.questManager = new QuestManager(FOREST_QUESTS);
      this.questManager.loadState(forestProgress?.quests);
      this.interactionManager = await this.interactionManagerFactory({
        player: this.player,
        landmarks: this.landmarks,
        items: this.items,
        inventory: this.inventoryManager,
        questManager: this.questManager,
        app: this.app,
      });
      this.interactionManager.loadState(forestProgress?.collections);
      this.panelCoordinator = new PanelCoordinator({ interactionManager: this.interactionManager });
      this.questUI = await this.questUIFactory({
        app: this.app,
        questManager: this.questManager,
        panelCoordinator: this.panelCoordinator,
        showCompletionToast: false,
      });
      this.inventoryUI = await this.inventoryUIFactory({
        app: this.app,
        inventory: this.inventoryManager,
        panelCoordinator: this.panelCoordinator,
      });
      this.directionIndicator = await this.directionIndicatorFactory({
        app: this.app,
        player: this.player,
        getTarget: () => this.getDirectionTarget(),
        getCameraForward: () => this.cameraController.getForwardDirection(),
      });
      this.createReturnButton();
      this.createMovementHint();

      const visual = await this.playerModelLoader(this.character.modelPath, { yawOffset: PLAYER_MODEL_FORWARD_OFFSET });
      if (this.isDisposed) {
        disposeObjectResources(visual);
        return this;
      }
      this.player.object3D.add(visual);
      this.player.enabled = true;
      this.setupAutosave();
      this.gameState?.set?.('PLAYING');
      this.clock = new THREE.Clock();
      this.renderer.setAnimationLoop(this.frame);
      return this;
    } catch (error) {
      this.exit();
      throw error;
    }
  }

  getRestoreForestProgress() {
    return this.initialRestoreData?.themeProgress?.[THEME_IDS.FOREST] ?? null;
  }

  restoreWorldPosition() {
    const saved = this.getRestoreForestProgress()?.world?.player;
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.z)) return;
    const maxRadius = ISLAND_WALKABLE_RADIUS - PLAYER_COLLISION_RADIUS;
    if (Math.hypot(saved.x, saved.z) > maxRadius) return;
    this.player.object3D.position.set(saved.x, this.groundHeightAt(saved.x, saved.z), saved.z);
    if (Number.isFinite(saved.rotationY)) this.player.object3D.rotation.y = saved.rotationY;
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

  getDirectionTarget() {
    const taskStates = this.questManager?.getSnapshot() ?? [];
    const landmarks = this.landmarks ?? [];
    const items = this.items ?? [];
    const hasPosition = (target) => Number.isFinite(target?.position?.x) && Number.isFinite(target?.position?.z);
    const targetsByTask = {};

    for (const task of taskStates) {
      const objective = task.objective ?? {};
      const landmarkIds = objective.landmarkIds
        ?? (task.type === 'explore_landmark' ? landmarks.map(({ id }) => id) : []);
      const collectibleIds = objective.collectibleIds
        ?? (task.type === 'collect_any' ? items.map(({ id }) => id) : []);
      const landmarkIdSet = new Set(landmarkIds);
      const collectibleIdSet = new Set(collectibleIds);
      targetsByTask[task.id] = [
        ...landmarks
          .filter((landmark) => landmarkIdSet.has(landmark.id)
            && hasPosition(landmark)
            && !this.questManager.hasExploredLandmark(landmark.id))
          .map((landmark) => ({
            id: landmark.id,
            kind: 'landmark',
            icon: landmark.icon ?? task.icon,
            name: landmark.title ?? landmark.name ?? landmark.id,
            position: landmark.position,
            interactionDistance: landmark.interactionDistance ?? 1,
          })),
        ...items
          .filter((item) => collectibleIdSet.has(item.id)
            && hasPosition(item)
            && !item.collected
            && !this.questManager.hasCollectedItem(item.id))
          .map((item) => ({
            id: item.id,
            kind: 'item',
            icon: item.icon ?? task.icon,
            name: item.name ?? item.id,
            position: item.position,
            interactionDistance: item.interactionDistance ?? 1,
          })),
      ];
    }

    return selectQuestTarget({
      taskStates,
      taskPriority: FOREST_QUESTS.map(({ id }) => id),
      preferProgress: false,
      targetsByTask,
      playerPosition: this.player?.object3D?.position ?? { x: 0, z: 0 },
    });
  }

  setupAutosave() {
    let previousCounts = this.inventoryManager.getCounts();
    this.unsubscribers.push(this.inventoryManager.subscribe((counts) => {
      const changed = Object.keys(counts).some((id) => counts[id] !== (previousCounts[id] ?? 0));
      previousCounts = counts;
      if (changed) this.scheduleSave();
    }));
    this.unsubscribers.push(this.questManager.subscribe((quests) => {
      if (quests.some((quest) => quest.progress > 0 || quest.completed)) this.scheduleSave();
    }));
  }

  scheduleSave() {
    this.saveManager.scheduleSave(() => this.getSaveData());
  }

  getSaveBase() {
    const latest = this.saveManager.loadResult();
    if (latest.ok && isV2SaveData(latest.data)) return latest.data;
    if (isV2SaveData(this.initialRestoreData)) return this.initialRestoreData;
    if (latest.status === 'missing' && this.character?.id) return createInitialSaveData(this.character.id);
    return null;
  }

  getSaveData() {
    const base = this.getSaveBase();
    if (!base || !this.player || !this.questManager || !this.inventoryManager || !this.interactionManager) return null;
    const previous = base.themeProgress?.[THEME_IDS.FOREST] ?? this.getRestoreForestProgress() ?? {};
    const completionResult = new AdventureThemeCompletionManager({
      themes: ADVENTURE_THEMES,
      themeProgress: base.themeProgress,
      questSnapshot: this.questManager.getSnapshot(),
    }).evaluateCompletion(THEME_IDS.FOREST);
    const isCompleted = previous.status === THEME_STATUSES.COMPLETED || completionResult.completed;
    const status = isCompleted ? THEME_STATUSES.COMPLETED : THEME_STATUSES.IN_PROGRESS;
    const collected = this.interactionManager.saveState();
    const forestProgress = {
      ...createThemeProgress(status),
      ...previous,
      status,
      quests: this.questManager.saveState(),
      inventory: this.inventoryManager.saveState(),
      collections: { ...(previous.collections ?? {}), ...collected },
      discoveries: previous.discoveries ?? {},
      nature: previous.nature ?? null,
      natureQuests: previous.natureQuests ?? null,
      badges: previous.badges ?? null,
      world: {
        ...(previous.world ?? {}),
        player: {
          x: this.player.object3D.position.x,
          z: this.player.object3D.position.z,
          rotationY: this.player.object3D.rotation.y,
        },
      },
      hasSeenTutorial: previous.hasSeenTutorial === true,
      completion: completionResult.completed ? completionResult.completion : previous.completion ?? null,
    };
    const data = {
      ...base,
      version: SAVE_VERSION,
      characterId: base.characterId || this.character.id,
      themeProgress: { ...base.themeProgress, [THEME_IDS.FOREST]: forestProgress },
    };
    return isV2SaveData(data) ? data : null;
  }

  frame = (deltaSeconds) => {
    if (!this.isActive || this.isDisposed) return;
    const delta = Number.isFinite(deltaSeconds) ? Math.min(deltaSeconds, 0.1) : 1 / 60;
    this.player?.update(delta);
    this.cameraController?.update(delta);
    this.interactionManager?.update();
    this.directionIndicator?.update();
    this.renderer?.render(this.scene, this.camera);
  };

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
      onBack();
      return true;
    } catch (error) {
      console.warn('無法保存森林探險進度；仍留在森林。', error);
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
    for (const unsubscribe of this.unsubscribers ?? []) unsubscribe();
    this.unsubscribers = [];
    this.questUI?.dispose();
    this.inventoryUI?.dispose();
    this.directionIndicator?.dispose();
    this.directionIndicator = null;
    this.panelCoordinator?.dispose();
    this.interactionManager?.dispose();
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
    this.questManager = null;
    this.inventoryManager = null;
    this.panelCoordinator = null;
    this.questUI = null;
    this.inventoryUI = null;
    this.items = null;
    this.landmarks = null;
    this.context = null;
    this.app = null;
    this.character = null;
    this.saveManager = null;
    this.onBack = null;
  }
}
