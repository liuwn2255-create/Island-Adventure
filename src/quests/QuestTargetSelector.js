export const DIRECTION_TASK_PRIORITY = Object.freeze([
  'crystal-explorer',
  'island-adventurer',
  'collector',
  'discover-life',
  'nature-observer',
  'nature-learner',
  'nature-guide',
]);

/** Selects a valid quest target from plain task, target, and player-position data. */
export function selectQuestTarget({
  taskStates = [],
  targetsByTask = {},
  taskPriority = DIRECTION_TASK_PRIORITY,
  preferProgress = true,
  playerPosition = { x: 0, z: 0 },
  currentLockedTarget = null,
  currentLockedTargetValid = false,
} = {}) {
  if (currentLockedTarget && currentLockedTargetValid) return currentLockedTarget;

  const taskById = new Map(taskStates.map((task) => [task.id, task]));
  const incompleteTasks = taskPriority
    .map((id) => taskById.get(id))
    .filter((task) => task && !task.completed);
  const progressedTasks = incompleteTasks.filter((task) => task.progress > 0);
  const candidates = preferProgress && progressedTasks.length > 0 ? progressedTasks : incompleteTasks;

  for (const task of candidates) {
    const targets = (targetsByTask[task.id] ?? []).filter((target) => target.isValid !== false);
    const nearestTarget = targets.reduce((nearest, target) => {
      const distance = Math.hypot(target.position.x - playerPosition.x, target.position.z - playerPosition.z);
      return !nearest || distance < nearest.distance ? { target, distance } : nearest;
    }, null)?.target;
    if (!nearestTarget) continue;

    const { isValid, ...selectedTarget } = nearestTarget;
    return { ...selectedTarget, taskId: task.id };
  }

  return null;
}
