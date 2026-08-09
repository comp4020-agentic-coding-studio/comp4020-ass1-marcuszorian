import { levels, type Level } from "../data/levels";
import { routes, type Route } from "../lib/network";
import { loadProgress } from "../lib/persistence";
import type { ProgressState } from "../lib/progress";
import type { FocusTarget } from "../lib/focus";

export type AppState = {
  levelIndex: number;
  broken: Set<string>;
  progress: ProgressState;
  focus: FocusTarget | null;
  tutorialStepIndex: number | null;
};

export function createInitialState(): AppState {
  return {
    levelIndex: 0,
    broken: new Set(),
    progress: loadProgress(),
    focus: null,
    tutorialStepIndex: null,
  };
}

export function currentLevel(state: AppState): Level {
  return levels[state.levelIndex];
}

export function currentRoutes(state: AppState): Route[] {
  const level = currentLevel(state);
  return routes(level, level.source, level.destinations, state.broken);
}
