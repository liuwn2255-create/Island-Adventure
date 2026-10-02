import * as THREE from 'three';
import { OCEAN_LEVEL } from '../environment/createTerrain.js';
import { createIslandEnvironment } from '../environment/createIslandEnvironment.js';

export function createIslandScene(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8ddf1');
  scene.fog = new THREE.Fog('#a8ddf1', 42, 145);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  app.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe9f8ff, 0x71804e, 2.15));
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.8);
  sun.position.set(-10, 20, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  const terrain = createIslandEnvironment(scene);
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
  window.addEventListener('resize', resize);

  return {
    scene,
    camera,
    renderer,
    groundHeightAt: terrain.heightAt,
    oceanLevel: OCEAN_LEVEL,
    resize,
    dispose() {
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
