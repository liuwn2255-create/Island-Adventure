import { Clock } from 'three';
import './style.css';
import { CHARACTERS } from './characters/characterConfig.js';
import { createCharacterSelectionScreen } from './characters/CharacterSelection.js';
import { PlayerController } from './player/PlayerController.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { MobileControls } from './input/MobileControls.js';
import { createLandmarks } from './landmarks/createLandmarks.js';
import { InteractionManager } from './interaction/InteractionManager.js';
import { createCollectibleItems } from './items/createCollectibleItems.js';
import { InventoryManager } from './items/InventoryManager.js';
import { InventoryUI } from './items/InventoryUI.js';
import { ItemDirectionIndicator } from './items/ItemDirectionIndicator.js';
import { BadgeManager } from './badges/BadgeManager.js';
import { BadgeUI } from './badges/BadgeUI.js';
import { BADGES } from './badges/badgeConfig.js';
import { QuestManager } from './quests/QuestManager.js';
import { QuestUI } from './quests/QuestUI.js';
import { DIRECTION_TASK_PRIORITY, selectQuestTarget } from './quests/QuestTargetSelector.js';
import { PanelCoordinator } from './ui/PanelCoordinator.js';
import { NatureGuideManager } from './nature/NatureGuideManager.js';
import { NatureGuideUI } from './nature/NatureGuideUI.js';
import { NatureObservationUI } from './nature/NatureObservationUI.js';
import { NatureQuizManager } from './nature/quiz/NatureQuizManager.js';
import { NatureQuizUI } from './nature/quiz/NatureQuizUI.js';
import { NatureQuestManager } from './nature/quests/NatureQuestManager.js';
import { NatureQuestUI } from './nature/quests/NatureQuestUI.js';
import { ButterflyController } from './nature/creatures/ButterflyController.js';
import { createButterfly } from './nature/creatures/createButterfly.js';
import { NatureCreatureInteraction } from './nature/creatures/NatureCreatureInteraction.js';
import { BUTTERFLY_CONFIG } from './nature/creatures/butterflyConfig.js';
import { createFrog } from './nature/creatures/createFrog.js';
import { FrogController } from './nature/creatures/FrogController.js';
import { FROG_CONFIG } from './nature/creatures/frogConfig.js';
import { HabitatManager } from './nature/habitats/HabitatManager.js';
import { loadPlayerModel, PLAYER_MODEL_FORWARD_OFFSET } from './player/PlayerModel.js';
import { createIslandScene } from './scene/createIslandScene.js';
import { AudioManager } from './audio/AudioManager.js';
import { GameState, GAME_STATES } from './game/GameState.js';
import { GameStartScreen } from './ui/GameStartScreen.js';
import { SaveManager } from './save/SaveManager.js';
import { ExitAdventureUI } from './ui/ExitAdventureUI.js';
import { FirstExplorationTutorial } from './ui/FirstExplorationTutorial.js';
import { QuestCompletionUI } from './ui/QuestCompletionUI.js';
import { NPCManager } from './npc/NPCManager.js';
import { NPCInteraction } from './npc/NPCInteraction.js';
import { NPCDialogUI } from './npc/NPCDialogUI.js';
import { ISLAND_RESIDENT_CONFIG } from './npc/NPCConfig.js';

const app = document.querySelector('#app');
const audioManager = new AudioManager({ app });
const gameState = new GameState();
gameState.subscribe((state) => { app.dataset.gameState = state; });
let saveToast;
let saveToastTimer;
const saveManager = new SaveManager({ app, onSaved: () => {
  if (!saveToast) {
    saveToast = document.createElement('div');
    saveToast.className = 'save-toast';
    saveToast.setAttribute('role', 'status');
    saveToast.textContent = '💾 已自動保存';
    app.appendChild(saveToast);
  }
  saveToast.classList.add('visible');
  window.clearTimeout(saveToastTimer);
  saveToastTimer = window.setTimeout(() => saveToast?.classList.remove('visible'), 1300);
} });
window.addEventListener('pagehide', () => saveManager.flush());
let characterSelection;
let gameStartScreen;
let activeAdventure;

function showGameStartScreen() {
  gameStartScreen?.dispose();
  gameStartScreen = new GameStartScreen({
    app,
    hasSave: saveManager.hasSave(),
    onStart: () => { audioManager.startGameAudio(); showCharacterSelection(); },
    onContinue: continueAdventure,
    onNewAdventure: beginNewAdventure,
  });
}

async function startAdventure(character, restoreData = null) {
  characterSelection?.dispose();
  characterSelection = null;
  const { scene, camera, renderer, groundHeightAt } = createIslandScene(app);
  audioManager.mount();
  // The audio control may have been detached with the paused HUD on return home.
  if (audioManager.button) app.appendChild(audioManager.button);
  const status = document.createElement('div');
  status.id = 'status';
  status.setAttribute('role', 'status');
  status.textContent = '正在載入探險家…';
  app.appendChild(status);
  let goalToast;
  let goalToastTimer;
  const showFirstExplorationGoal = () => {
    if (!goalToast) {
      goalToast = document.createElement('div');
      goalToast.className = 'first-exploration-goal';
      goalToast.setAttribute('role', 'status');
      goalToast.innerHTML = '<strong>🌟 第一個小目標</strong><span>去附近看看吧！</span>';
      app.appendChild(goalToast);
    }
    goalToast.classList.add('visible');
    window.clearTimeout(goalToastTimer);
    goalToastTimer = window.setTimeout(() => goalToast?.classList.remove('visible'), 3200);
  };

  let cameraController;
  const player = new PlayerController(scene, {
    groundHeightAt,
    getCameraForward: () => cameraController.getForwardDirection(),
  });
  player.enabled = false;
  cameraController = new ThirdPersonCamera({ camera, canvas: renderer.domElement, player: player.object3D });
  const mobileControls = new MobileControls({
    app,
    canvas: renderer.domElement,
    player,
    onCameraChange(deltaX, deltaY) {
      cameraController.rotateBy(deltaX, deltaY);
    },
  });
  const landmarks = createLandmarks(scene, groundHeightAt);
  const items = createCollectibleItems(scene, groundHeightAt);
  const npcManager = new NPCManager({ scene, groundHeightAt, config: ISLAND_RESIDENT_CONFIG });
  const habitatManager = new HabitatManager({ heightAt: groundHeightAt, landmarks, items });
  const inventory = new InventoryManager();
  const questManager = new QuestManager();
  if (restoreData) {
    inventory.loadState(restoreData.inventory);
    questManager.loadState(restoreData.quests);
  }
  const natureGuideManager = new NatureGuideManager();
  if (restoreData) natureGuideManager.loadState(restoreData.nature);
  const natureQuestManager = new NatureQuestManager();
  if (restoreData) natureQuestManager.loadState(restoreData.natureQuests);
  natureQuestManager.syncDiscoveries(natureGuideManager.getEntries().filter((entry) => entry.discovered).map((entry) => entry.id));
  const completionBadgeToastIds = new Map();
  let badgeManager;
  const unsubscribeQuestBadgeSuppression = questManager.subscribeCompleted((quest) => {
    const badge = BADGES.find((entry) => entry.questId === quest.id);
    if (badge && !badgeManager?.hasBadge(badge.id)) completionBadgeToastIds.set(badge.id, quest.id);
  });
  const unsubscribeNatureBadgeSuppression = natureQuestManager.subscribeCompleted((quest) => {
    if (natureQuestManager.areAllCompleted() && !badgeManager?.hasBadge('nature-explorer')) {
      completionBadgeToastIds.set('nature-explorer', quest.id);
    }
  });
  badgeManager = new BadgeManager({ questManager, natureQuestManager });
  if (restoreData) badgeManager.loadState(restoreData.badges);
  badgeManager.syncNatureQuestCompletion();
  questManager.subscribeCompleted(() => audioManager.playSfx('questComplete'));
  let unlockedBadgeIds = new Set(badgeManager.getBadges().map((badge) => badge.id));
  badgeManager.subscribe((badges) => {
    const nextIds = new Set(badges.map((badge) => badge.id));
    for (const id of nextIds) {
      if (!unlockedBadgeIds.has(id)) audioManager.playSfx('badgeUnlock');
    }
    unlockedBadgeIds = nextIds;
  });
  const interactionManager = new InteractionManager({ player, landmarks, items, inventory, questManager, app });
  if (restoreData) interactionManager.loadState(restoreData.world);
  const panelCoordinator = new PanelCoordinator({ interactionManager });
  const npcDialogUI = new NPCDialogUI({
    app,
    panelCoordinator,
    config: ISLAND_RESIDENT_CONFIG,
    onOpenChange: (open) => npcManager.setPaused(open),
  });
  const npcInteraction = new NPCInteraction({ npcManager, dialogUI: npcDialogUI });
  interactionManager.setAdditionalInteractables(() => npcInteraction.getInteractables());
  const natureQuizManager = new NatureQuizManager({ natureGuideManager });
  natureQuizManager.subscribeCompleted((result) => {
    if (result.correct) {
      badgeManager.unlockBadge('nature-learner');
      natureQuestManager.recordCorrectAnswer();
    }
  });
  natureGuideManager.subscribe((entries) => {
    for (const entry of entries) if (entry.discovered) natureQuestManager.recordDiscovery(entry.id);
  });
  let discoveredNatureIds = new Set(natureGuideManager.getEntries().filter((entry) => entry.discovered).map((entry) => entry.id));
  natureGuideManager.subscribe((entries) => {
    const nextIds = new Set(entries.filter((entry) => entry.discovered).map((entry) => entry.id));
    for (const id of nextIds) {
      if (!discoveredNatureIds.has(id)) audioManager.playSfx('discover');
    }
    discoveredNatureIds = nextIds;
  });
  const questUI = new QuestUI({ app, questManager, panelCoordinator, showCompletionToast: false });
  const badgeUI = new BadgeUI({
    app,
    badgeManager,
    panelCoordinator,
      shouldShowUnlockToast: (badge) => !completionBadgeToastIds.has(badge.id),
  });
  const natureGuideUI = new NatureGuideUI({
    app,
    natureGuideManager,
    panelCoordinator,
    onOpen: () => audioManager.playSfx('openGuide'),
  });
  const natureQuestUI = new NatureQuestUI({ app, natureQuestManager, panelCoordinator, showCompletionToast: false });
  const butterflyVisual = createButterfly();
  scene.add(butterflyVisual.group);
  const butterflyController = new ButterflyController({
    ...butterflyVisual,
    groundHeightAt,
    habitatManager,
  });
  const frogVisual = createFrog();
  scene.add(frogVisual.group);
  const frogController = new FrogController({
    ...frogVisual,
    groundHeightAt,
    habitatManager,
  });
  const natureCreatureControllers = [butterflyController, frogController];
  const setNatureCreaturesPaused = (paused) => {
    for (const controller of natureCreatureControllers) controller.setPaused(paused);
  };
  const questCompletionUI = new QuestCompletionUI({
    app,
    panelCoordinator,
    interactionManager,
    questManager,
    natureQuestManager,
    onOpenChange: setNatureCreaturesPaused,
    onComplete: ({ kind }) => {
      if (kind === 'nature') audioManager.playSfx('questComplete');
    },
    getBadgeForCompletion(quest, kind) {
      const badge = kind === 'general'
        ? BADGES.find((entry) => entry.questId === quest.id)
        : natureQuestManager.areAllCompleted() ? BADGES.find((entry) => entry.id === 'nature-explorer') : null;
      if (!badge || !badgeManager.hasBadge(badge.id) || completionBadgeToastIds.get(badge.id) !== quest.id) return null;
      completionBadgeToastIds.delete(badge.id);
      return badge;
    },
  });
  const quizUI = new NatureQuizUI({
    app,
    panelCoordinator,
    quizManager: natureQuizManager,
    onOpenChange: setNatureCreaturesPaused,
  });
  const observationUI = new NatureObservationUI({
    app,
    panelCoordinator,
    onOpenChange: setNatureCreaturesPaused,
    onStartQuiz(entry) {
      const quiz = natureQuizManager.startQuiz(entry?.id);
      if (quiz) quizUI.open(quiz);
    },
  });
  const natureCreatureInteraction = new NatureCreatureInteraction({
    app,
    player,
    creatures: [
      { config: BUTTERFLY_CONFIG, controller: butterflyController },
      { config: FROG_CONFIG, controller: frogController },
    ],
    interactionManager,
    panelCoordinator,
    natureGuideManager,
    observationUI,
    onObservation: () => natureQuestManager.recordObservation(),
  });
  const creatureTargets = [
    { config: BUTTERFLY_CONFIG, controller: butterflyController, icon: '🦋' },
    { config: FROG_CONFIG, controller: frogController, icon: '🐸' },
  ];
  let lockedDirectionTarget = null;

  const getDirectionTaskStates = () => [
    ...questManager.getSnapshot(),
    ...natureQuestManager.getQuests(),
  ];

  const getTaskTargets = (taskId) => {
    if (taskId === 'crystal-explorer') {
      return items
        .filter((item) => item.type === 'mysterious-crystal' && !questManager.hasCollectedItem(item.id))
        .map((item) => ({ id: item.id, kind: 'item', icon: item.icon, name: item.name, position: item.position, interactionDistance: item.interactionDistance, object: item }));
    }
    if (taskId === 'collector') {
      return items
        .filter((item) => !questManager.hasCollectedItem(item.id))
        .map((item) => ({ id: item.id, kind: 'item', icon: item.icon, name: item.name, position: item.position, interactionDistance: item.interactionDistance, object: item }));
    }
    if (taskId === 'island-adventurer') {
      return landmarks
        .filter((landmark) => !questManager.hasExploredLandmark(landmark.id))
        .map((landmark) => ({ id: landmark.id, kind: 'landmark', icon: landmark.icon, name: landmark.title, position: landmark.position, interactionDistance: landmark.interactionDistance, object: landmark }));
    }
    if (taskId === 'discover-life' || taskId === 'nature-guide') {
      return creatureTargets
        .filter(({ config }) => !natureGuideManager.isDiscovered(config.id))
        .map(({ config, controller, icon }) => ({ id: config.id, kind: 'creature', icon, name: config.name, position: controller.group.position, interactionDistance: config.interactionDistance, object: controller }));
    }
    if (taskId === 'nature-observer' || taskId === 'nature-learner') {
      return creatureTargets
        .filter(({ config }) => natureGuideManager.isDiscovered(config.id))
        .map(({ config, controller, icon }) => ({ id: config.id, kind: 'creature', icon, name: config.name, position: controller.group.position, interactionDistance: config.interactionDistance, object: controller }));
    }
    return [];
  };

  const isDirectionTargetValid = (target, taskStates) => {
    const task = taskStates.find((entry) => entry.id === target.taskId);
    if (!task || task.completed) return false;
    if (target.kind === 'item') return !questManager.hasCollectedItem(target.id);
    if (target.kind === 'landmark') return !questManager.hasExploredLandmark(target.id);
    if (target.taskId === 'discover-life' || target.taskId === 'nature-guide') {
      return !natureGuideManager.isDiscovered(target.id);
    }
    return natureGuideManager.isDiscovered(target.id);
  };

  const getDirectionTarget = () => {
    const taskStates = getDirectionTaskStates();
    const currentLockedTargetValid = Boolean(
      lockedDirectionTarget && isDirectionTargetValid(lockedDirectionTarget, taskStates),
    );
    const targetsByTask = currentLockedTargetValid
      ? {}
      : Object.fromEntries(DIRECTION_TASK_PRIORITY.map((taskId) => [
        taskId,
        getTaskTargets(taskId).map((target) => ({
          ...target,
          isValid: isDirectionTargetValid({ ...target, taskId }, taskStates),
        })),
      ]));

    lockedDirectionTarget = selectQuestTarget({
      taskStates,
      targetsByTask,
      playerPosition: player.object3D.position,
      currentLockedTarget: lockedDirectionTarget,
      currentLockedTargetValid,
    });
    return lockedDirectionTarget;
  };
  const itemDirectionIndicator = new ItemDirectionIndicator({
    app,
    player,
    getTarget: getDirectionTarget,
    getCameraForward: () => cameraController.getForwardDirection(),
  });
  const inventoryUI = new InventoryUI({ app, inventory, panelCoordinator });
  let previousInventoryCounts = inventory.getCounts();
  const getSaveData = () => ({
    characterId: character.id,
    hasSeenTutorial,
    inventory: inventory.saveState(),
    quests: questManager.saveState(),
    badges: badgeManager.saveState(),
    nature: natureGuideManager.saveState(),
    natureQuests: natureQuestManager.saveState(),
    world: interactionManager.saveState(),
  });
  let hasSeenTutorial = restoreData?.hasSeenTutorial === true;
  let firstTutorialPending = !hasSeenTutorial;
  const scheduleSave = () => saveManager.scheduleSave(getSaveData);
  inventory.subscribe((counts) => {
    const collected = Object.keys(counts).some((id) => counts[id] > (previousInventoryCounts[id] ?? 0));
    previousInventoryCounts = counts;
    if (collected) { audioManager.playSfx('collect'); scheduleSave(); }
  });
  questManager.subscribe((snapshot) => {
    if (snapshot.some((quest) => quest.progress > 0 || quest.completed)) scheduleSave();
  });
  badgeManager.subscribe((badges) => {
    const nextIds = new Set(badges.map((badge) => badge.id));
    scheduleSave();
  });
  natureGuideManager.subscribe((entries) => {
    const nextIds = new Set(entries.filter((entry) => entry.discovered).map((entry) => entry.id));
    scheduleSave();
  });
  natureQuestManager.subscribe(() => scheduleSave());
  // Persist the selected character and restored baseline as soon as the world is ready.
  saveManager.save(getSaveData());
  const visual = await loadPlayerModel(character.modelPath, { yawOffset: PLAYER_MODEL_FORWARD_OFFSET });
  player.object3D.add(visual);
  gameState.set(GAME_STATES.PLAYING);
  player.enabled = true;
  status.textContent = 'W / A / S / D 移動';
  window.setTimeout(() => status.classList.add('hidden'), 1800);

  const clock = new Clock();

  function frame() {
    const deltaSeconds = Math.min(clock.getDelta(), 0.1);
    player.update(deltaSeconds);
    cameraController.update(deltaSeconds);
    butterflyController.update(deltaSeconds);
    frogController.update(deltaSeconds);
    npcManager.update(deltaSeconds);
    interactionManager.update();
    natureCreatureInteraction.update();
    itemDirectionIndicator.update();
    questCompletionUI.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  const exitUI = new ExitAdventureUI({
    app,
    panelCoordinator,
    onLeave: () => activeAdventure?.returnHome(),
    onOpenChange: setNatureCreaturesPaused,
  });
  const isTouchDevice = navigator.maxTouchPoints > 0
    || window.matchMedia?.('(any-pointer: coarse)').matches;
  const tutorialUI = new FirstExplorationTutorial({
    app,
    panelCoordinator,
    isTouch: isTouchDevice,
    onOpenChange: setNatureCreaturesPaused,
    onDismiss: ({ firstRun }) => {
      if (!firstRun || !firstTutorialPending) return;
      hasSeenTutorial = true;
      firstTutorialPending = false;
      saveManager.flush();
      saveManager.save(getSaveData());
    },
    onFirstRunComplete: () => showFirstExplorationGoal(),
  });
  const onEscape = (event) => {
    if (event.code !== 'Escape' || gameState.is(GAME_STATES.START)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (panelCoordinator.activePanelId) {
      panelCoordinator.close(panelCoordinator.activePanelId);
      return;
    }
    if (interactionManager.activeLandmark) {
      interactionManager.closeDialog();
      return;
    }
    exitUI.open();
  };
  // Handle Escape before individual panels so one keypress closes one layer only.
  window.addEventListener('keydown', onEscape, true);

  let paused = false;
  let savedAdventureNodes = null;
  activeAdventure = {
    returnHome() {
      if (paused) return;
      saveManager.flush();
      saveManager.save(getSaveData());
      player.enabled = false;
      player.pressed.clear();
      player.setExternalInput(0, 0);
      interactionManager.setSuspended(true);
      setNatureCreaturesPaused(true);
      renderer.setAnimationLoop(null);
      audioManager.stopMusic();
      audioManager.stopEnvironment();
      savedAdventureNodes = [...app.childNodes];
      paused = true;
      gameState.set(GAME_STATES.START);
      showGameStartScreen();
    },
    resume() {
      if (!paused || !savedAdventureNodes) return false;
      gameStartScreen?.dispose();
      gameStartScreen = null;
      app.replaceChildren(...savedAdventureNodes);
      savedAdventureNodes = null;
      paused = false;
      gameState.set(GAME_STATES.PLAYING);
      interactionManager.setSuspended(false);
      player.enabled = true;
      setNatureCreaturesPaused(false);
      renderer.setAnimationLoop(frame);
      audioManager.startGameAudio();
      if (firstTutorialPending) tutorialUI.open({ firstRun: true });
      return true;
    },
    isPaused() { return paused; },
    dispose() {
      window.removeEventListener('keydown', onEscape, true);
      renderer.setAnimationLoop(null);
      player.enabled = false;
      setNatureCreaturesPaused(true);
      exitUI.dispose();
      tutorialUI.dispose();
      npcDialogUI.dispose();
      npcInteraction.dispose();
      npcManager.dispose();
      questCompletionUI.dispose();
      quizUI.dispose();
      observationUI.dispose();
      natureCreatureInteraction.dispose();
      questUI.dispose();
      badgeUI.dispose();
      natureGuideUI.dispose();
      natureQuestUI.dispose();
      inventoryUI.dispose();
      panelCoordinator.dispose();
      itemDirectionIndicator.dispose();
      interactionManager.dispose();
      unsubscribeQuestBadgeSuppression();
      unsubscribeNatureBadgeSuppression();
      mobileControls.dispose();
      cameraController.dispose();
      player.dispose();
      renderer.dispose();
      status.remove();
      window.clearTimeout(saveToastTimer);
      window.clearTimeout(goalToastTimer);
      saveToast?.remove();
      saveToast = null;
      goalToast?.remove();
      goalToast = null;
      savedAdventureNodes = null;
    },
  };
  if (firstTutorialPending) tutorialUI.open({ firstRun: true });
}

function showCharacterSelection() {
  gameStartScreen?.dispose();
  gameStartScreen = null;
  gameState.set(GAME_STATES.CHARACTER_SELECT);
  characterSelection = createCharacterSelectionScreen({
    app,
    characters: CHARACTERS,
    onStart: startAdventure,
  });
  audioManager.startGameAudio();
}

function beginNewAdventure() {
  activeAdventure?.dispose();
  activeAdventure = null;
  saveManager.clearSave();
  audioManager.startGameAudio();
  showCharacterSelection();
}

async function continueAdventure() {
  if (activeAdventure?.isPaused()) return activeAdventure.resume();
  const data = saveManager.load();
  const character = CHARACTERS.find((entry) => entry.id === data?.characterId);
  if (!data || !character) {
    saveManager.clearSave();
    audioManager.startGameAudio();
    showCharacterSelection();
    return;
  }
  gameStartScreen?.dispose();
  gameStartScreen = null;
  audioManager.startGameAudio();
  await startAdventure(character, data);
}

showGameStartScreen();


