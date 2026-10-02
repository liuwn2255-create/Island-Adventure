import { ISLAND_WALKABLE_RADIUS } from '../../config/gameConfig.js';
import { OCEAN_LEVEL } from '../../environment/createTerrain.js';
import { CREATURE_HABITATS, HABITAT_SAFETY } from './habitatConfig.js';

/** Selects bounded, terrain-safe activity points from each creature's habitat patches. */
export class HabitatManager {
  constructor({ heightAt, landmarks = [], items = [], habitats = CREATURE_HABITATS, random = Math.random }) {
    this.heightAt = heightAt;
    this.landmarks = landmarks;
    this.items = items;
    this.habitats = habitats;
    this.random = random;
  }

  getAreas(speciesId) {
    return this.habitats[speciesId]?.areas ?? [];
  }

  getDefaultAreaId(speciesId) {
    return this.habitats[speciesId]?.primaryArea ?? null;
  }

  isSafePosition(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    if (Math.hypot(x, z) > ISLAND_WALKABLE_RADIUS - HABITAT_SAFETY.islandEdgeMargin) return false;
    if (this.heightAt(x, z) <= OCEAN_LEVEL + HABITAT_SAFETY.oceanHeightMargin) return false;

    const awayFromLandmarks = this.landmarks.every((landmark) => {
      const position = landmark.position ?? landmark.object3D?.position;
      if (!position) return true;
      const separation = Math.hypot(x - position.x, z - position.z);
      return separation >= (landmark.interactionDistance ?? 0) + HABITAT_SAFETY.landmarkMargin;
    });
    if (!awayFromLandmarks) return false;

    return this.items.every((item) => {
      if (item.collected) return true;
      const position = item.position ?? item.object3D?.position;
      if (!position) return true;
      const separation = Math.hypot(x - position.x, z - position.z);
      return separation >= (item.interactionDistance ?? 0) + HABITAT_SAFETY.collectibleMargin;
    });
  }

  isPositionInHabitat(speciesId, x, z, areaId = null) {
    if (!this.isSafePosition(x, z)) return false;
    return this.getAreas(speciesId).some((area) => {
      if (areaId && area.id !== areaId) return false;
      return Math.hypot(x - area.center.x, z - area.center.z) <= area.radius;
    });
  }

  getRandomActivityPosition(speciesId, { areaId = this.getDefaultAreaId(speciesId), origin = null, maxDistance = Infinity } = {}) {
    const area = this.getAreas(speciesId).find((entry) => entry.id === areaId);
    if (!area) return null;

    for (let attempt = 0; attempt < HABITAT_SAFETY.positionAttempts; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const radius = Math.sqrt(this.random()) * area.radius;
      const x = area.center.x + Math.cos(angle) * radius;
      const z = area.center.z + Math.sin(angle) * radius;
      if (!this.isPositionInHabitat(speciesId, x, z, area.id)) continue;
      if (origin && Math.hypot(x - origin.x, z - origin.z) > maxDistance) continue;
      return { x, y: this.heightAt(x, z), z, areaId: area.id };
    }

    const { x, z } = area.center;
    if (this.isPositionInHabitat(speciesId, x, z, area.id)
      && (!origin || Math.hypot(x - origin.x, z - origin.z) <= maxDistance)) {
      return { x, y: this.heightAt(x, z), z, areaId: area.id };
    }
    if (origin && this.isPositionInHabitat(speciesId, origin.x, origin.z, area.id)) {
      return { x: origin.x, y: this.heightAt(origin.x, origin.z), z: origin.z, areaId: area.id };
    }
    return null;
  }
}
