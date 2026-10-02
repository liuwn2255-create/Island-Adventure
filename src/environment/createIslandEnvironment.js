import { createOcean } from './createOcean.js';
import { createPath } from './createPath.js';
import { createRocks } from './createRocks.js';
import { createTerrain } from './createTerrain.js';
import { createVegetation } from './createVegetation.js';

export function createIslandEnvironment(scene) {
  const terrain = createTerrain(scene);
  createOcean(scene);
  const path = createPath(scene, terrain.heightAt);
  createVegetation(scene, terrain.heightAt, path);
  createRocks(scene, terrain.heightAt);
  return terrain;
}
