import * as THREE from 'three';
import { PLAYER_MODEL_HEIGHT } from '../config/gameConfig.js';
import { loadPlayerModel } from '../player/PlayerModel.js';

export function createCharacterPreview(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dceff6');

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, PLAYER_MODEL_HEIGHT * 0.57, 4.25);
  camera.lookAt(0, PLAYER_MODEL_HEIGHT * 0.52, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'character-preview-canvas';
  renderer.setClearColor('#dceff6', 1);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf4fbff, 0x8aa28e, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff4df, 2.5);
  keyLight.position.set(-2.5, 5, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd8efff, 1.15);
  fillLight.position.set(3, 2, 3);
  scene.add(fillLight);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.28, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: '#b7d5c2', roughness: 0.82 }),
  );
  platform.position.y = -0.08;
  platform.receiveShadow = true;
  scene.add(platform);

  let activeVisual = null;
  let loadSequence = 0;
  const render = () => renderer.render(scene, camera);
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  });
  observer.observe(container);

  return {
    async showCharacter(character) {
      const sequence = ++loadSequence;
      const visual = await loadPlayerModel(character.modelPath);
      if (sequence !== loadSequence) return;
      if (activeVisual) scene.remove(activeVisual);
      activeVisual = visual;
      scene.add(activeVisual);
      render();
    },
    dispose() {
      loadSequence += 1;
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

