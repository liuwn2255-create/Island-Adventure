import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_STATES, GameState } from '../src/game/GameState.js';

test('GameState accepts the Adventure World flow state and notifies subscribers', () => {
  const state = new GameState();
  const updates = [];
  state.subscribe((value) => updates.push(value));
  assert.equal(state.set(GAME_STATES.CHARACTER_SELECT), true);
  assert.equal(state.set(GAME_STATES.ADVENTURE_WORLD), true);
  assert.equal(state.is(GAME_STATES.ADVENTURE_WORLD), true);
  assert.deepEqual(updates, [GAME_STATES.START, GAME_STATES.CHARACTER_SELECT, GAME_STATES.ADVENTURE_WORLD]);
});

test('GameState continues to reject unused states', () => {
  const state = new GameState();
  assert.throws(() => state.set('THEME_COMPLETE'), /Unknown game state/);
});
