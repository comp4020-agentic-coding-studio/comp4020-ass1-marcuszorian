import type { Level } from "../data/levels";
import { roundTrip, type RoundTrip } from "../lib/network";
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

export function levelRoundTrip(state: LevelState): RoundTrip | null {
  return roundTrip(state.level, state.level.source, state.level.destinations, state.broken);
}
