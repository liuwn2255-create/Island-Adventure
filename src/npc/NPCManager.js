import * as THREE from 'three';
import { ISLAND_RESIDENT_CONFIG } from './NPCConfig.js';
import { NPCAnimationController } from './NPCAnimationController.js';
import { NPCModelLoader } from './NPCModelLoader.js';
import { NPCMovement, NPC_MOVEMENT_STATES } from './NPCMovement.js';

function material(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
}

/** Creates and owns the patrolling island resident model. */
export class NPCManager {
  constructor({ scene, groundHeightAt, config = ISLAND_RESIDENT_CONFIG }) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = `NPC-${config.id}`;
    this.group.position.set(config.position.x, groundHeightAt(config.position.x, config.position.z), config.position.z);
    this.disposed = false;
    this.modelVisual = null;
    this.animationController = null;

    this.fallbackVisual = new THREE.Group();
    this.fallbackVisual.name = 'NPCFallbackVisual';
    this.group.add(this.fallbackVisual);

    const skin = material('#d6a27d');
    const clothes = material('#4d8176');
    const trousers = material('#566274');
    const boots = material('#59493d');
    const hair = material('#493b35');
    const eyes = material('#27333a', 0.45);

    const addMesh = (geometry, meshMaterial, position, scale = null) => {
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      mesh.position.set(...position);
      if (scale) mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.fallbackVisual.add(mesh);
      return mesh;
    };

    // Geometry is modeled with feet at y=0 and the face looking toward +Z.
    addMesh(new THREE.SphereGeometry(0.245, 10, 8), skin, [0, 1.39, 0]);
    addMesh(new THREE.SphereGeometry(0.252, 9, 6), hair, [0, 1.54, -0.035], [1, 0.64, 0.95]);
    addMesh(new THREE.SphereGeometry(0.027, 6, 5), eyes, [-0.082, 1.42, 0.22]);
    addMesh(new THREE.SphereGeometry(0.027, 6, 5), eyes, [0.082, 1.42, 0.22]);
    addMesh(new THREE.CylinderGeometry(0.19, 0.26, 0.58, 7), clothes, [0, 0.91, 0]);

    const leftArm = addMesh(new THREE.CylinderGeometry(0.075, 0.09, 0.55, 6), clothes, [-0.31, 0.91, 0]);
    leftArm.rotation.z = -0.11;
    const rightArm = addMesh(new THREE.CylinderGeometry(0.075, 0.09, 0.55, 6), clothes, [0.31, 0.91, 0]);
    rightArm.rotation.z = 0.11;
    addMesh(new THREE.SphereGeometry(0.09, 7, 5), skin, [-0.34, 0.61, 0]);
    addMesh(new THREE.SphereGeometry(0.09, 7, 5), skin, [0.34, 0.61, 0]);

    const leftLeg = addMesh(new THREE.CylinderGeometry(0.095, 0.11, 0.43, 6), trousers, [-0.12, 0.38, 0]);
    const rightLeg = addMesh(new THREE.CylinderGeometry(0.095, 0.11, 0.43, 6), trousers, [0.12, 0.38, 0]);
    leftLeg.rotation.z = -0.035;
    rightLeg.rotation.z = 0.035;
    addMesh(new THREE.BoxGeometry(0.19, 0.12, 0.29), boots, [-0.12, 0.1, 0.055]);
    addMesh(new THREE.BoxGeometry(0.19, 0.12, 0.29), boots, [0.12, 0.1, 0.055]);

    this.materials = [skin, clothes, trousers, boots, hair, eyes];
    scene.add(this.group);
    this.loadModel(config.model);
    this.movement = config.patrol ? new NPCMovement({
      group: this.group,
      groundHeightAt,
      ...config.patrol,
    }) : null;
  }

  async loadModel(modelConfig) {
    if (!modelConfig?.path) return;

    try {
      const loader = new NPCModelLoader();
      const { scene: model, animations } = await loader.load(modelConfig.path);
      if (this.disposed) {
        this.disposeModel(model);
        return;
      }

      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);
      const sourceHeight = size.y || Math.max(size.x, size.y, size.z) || 1;
      const scale = modelConfig.height / sourceHeight;

      const visual = new THREE.Group();
      visual.name = 'NPCModelVisual';
      visual.rotation.y = modelConfig.yawOffset ?? 0;

      const fit = new THREE.Group();
      fit.name = 'NPCModelFit';
      fit.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      fit.scale.setScalar(scale);
      fit.add(model);
      visual.add(fit);
      model.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = true;
          part.receiveShadow = true;
        }
      });

      this.group.add(visual);
      this.modelVisual = visual;
      this.animationController = new NPCAnimationController({ visual: model, animations });
      this.animationController.setMoving(this.isMovementActive());
      this.fallbackVisual.visible = false;
    } catch (error) {
      if (!this.disposed) {
        console.warn(`NPC 模型載入失敗，繼續使用幾何人物：${modelConfig.path}`, error);
      }
    }
  }

  disposeModel(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) textures.add(value);
        }
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
  }

  update(deltaSeconds) {
    this.movement?.update(deltaSeconds);
    this.animationController?.setMoving(this.isMovementActive());
    this.animationController?.update(deltaSeconds);
  }

  setPaused(paused) {
    this.movement?.setPaused(paused);
    this.animationController?.setMoving(this.isMovementActive());
  }

  isMovementActive() {
    if (!this.movement || this.movement.paused) return false;
    return this.movement.state === NPC_MOVEMENT_STATES.WALK_TO_POINT
      || this.movement.state === NPC_MOVEMENT_STATES.WALK_TO_START;
  }

  getInteractable(interact) {
    return {
      id: this.config.id,
      kind: 'npc',
      title: this.config.title,
      position: this.group.position,
      interactionDistance: this.config.interactionDistance,
      interact,
    };
  }

  dispose() {
    this.disposed = true;
    this.animationController?.dispose();
    if (this.modelVisual) this.disposeModel(this.modelVisual);
    this.group.removeFromParent();
    this.group.traverse((child) => child.geometry?.dispose());
    for (const entry of this.materials) entry.dispose();
  }
}
