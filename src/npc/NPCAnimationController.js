import { AnimationMixer } from 'three';

/** Plays only visual Idle/Walk clips; it never owns or moves the patrol root. */
export class NPCAnimationController {
  constructor({ visual, animations = [], crossFadeDuration = 0.25 }) {
    if (!visual) throw new TypeError('NPCAnimationController requires a visual root.');

    this.visual = visual;
    this.mixer = new AnimationMixer(visual);
    this.crossFadeDuration = crossFadeDuration;
    this.idleAction = this.createAction(animations, 'idle');
    this.walkAction = this.createAction(animations, 'walk');
    this.currentAction = null;
    this.currentState = null;
    this.setMoving(false);
  }

  createAction(animations, expectedName) {
    const clip = animations.find((entry) => entry.name?.toLowerCase() === expectedName);
    return clip ? this.mixer.clipAction(clip) : null;
  }

  setMoving(isMoving) {
    const nextState = isMoving ? 'walk' : 'idle';
    const nextAction = isMoving ? this.walkAction : this.idleAction;
    if (!nextAction) return false;
    if (nextAction === this.currentAction) return true;

    const previousAction = this.currentAction;
    nextAction.reset();
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();
    if (previousAction) previousAction.crossFadeTo(nextAction, this.crossFadeDuration, false);

    this.currentAction = nextAction;
    this.currentState = nextState;
    return true;
  }

  update(deltaSeconds) {
    if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) this.mixer.update(deltaSeconds);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.visual);
  }
}
