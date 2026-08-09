import type { Level } from "../data/levels";
import { routes, type Route } from "../lib/network";
import type { FocusTarget } from "../lib/focus";
import { initialCamera, type Camera } from "./zoom";

/**
 * Every level is on the page at once, so each one owns its own breakage,
 * keyboard focus and camera. Only the completion count is shared, and that
 * lives in ProgressState rather than here.
 */
export type LevelState = {
  level: Level;
  broken: Set<string>;
  focus: FocusTarget | null;
  camera: Camera;
};

export function createLevelState(level: Level): LevelState {
  return {
    level,
    broken: new Set(),
    focus: null,
    camera: initialCamera(),
  };
}

export function levelRoutes(state: LevelState): Route[] {
  return routes(state.level, state.level.source, state.level.destinations, state.broken);
}
