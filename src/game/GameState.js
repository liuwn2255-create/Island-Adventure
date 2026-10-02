export const GAME_STATES = Object.freeze({
  START: 'START',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  PLAYING: 'PLAYING',
});

const VALID_STATES = new Set(Object.values(GAME_STATES));

/** Small state holder for the game's three entry-flow screens. */
export class GameState {
  constructor(initialState = GAME_STATES.START) {
    if (!VALID_STATES.has(initialState)) throw new Error(`Unknown game state: ${initialState}`);
    this.current = initialState;
    this.listeners = new Set();
  }

  set(nextState) {
    if (!VALID_STATES.has(nextState)) throw new Error(`Unknown game state: ${nextState}`);
    if (this.current === nextState) return false;
    this.current = nextState;
    for (const listener of this.listeners) listener(nextState);
    return true;
  }

  is(state) {
    return this.current === state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }
}
