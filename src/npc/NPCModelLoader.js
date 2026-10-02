import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Loads an NPC glTF/GLB asset without taking ownership of playback or placement. */
export class NPCModelLoader {
  constructor(loader = new GLTFLoader()) {
    this.loader = loader;
  }

  async load(url) {
    const gltf = await this.loader.loadAsync(url);
    return {
      scene: gltf.scene,
      animations: gltf.animations,
    };
  }
}
