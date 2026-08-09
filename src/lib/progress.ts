export type ProgressState = {
  completedLevels: Set<number>;
  hintsSeen: Set<string>;
  hintsEnabled: boolean;
};

export function initialProgress(): ProgressState {
  return {
    completedLevels: new Set(),
    hintsSeen: new Set(),
    hintsEnabled: true,
  };
}

export function recordBreak(state: ProgressState, levelId: number, connected: boolean): ProgressState {
  const completedLevels = new Set(state.completedLevels);
  if (!connected) {
    completedLevels.add(levelId);
  }
  return { ...state, completedLevels };
}

export function markHintSeen(state: ProgressState, hintId: string): ProgressState {
  const hintsSeen = new Set(state.hintsSeen);
  hintsSeen.add(hintId);
  return { ...state, hintsSeen };
}

export function shouldShowHint(state: ProgressState, hintId: string): boolean {
  return state.hintsEnabled && !state.hintsSeen.has(hintId);
}

export function setHintsEnabled(state: ProgressState, enabled: boolean): ProgressState {
  return { ...state, hintsEnabled: enabled };
}

export function resetProgress(state: ProgressState): ProgressState {
  return {
    completedLevels: new Set(),
    hintsSeen: new Set(),
    hintsEnabled: state.hintsEnabled,
  };
}

type SerializedProgress = {
  completedLevels: number[];
  hintsSeen: string[];
  hintsEnabled: boolean;
};

export function serializeProgress(state: ProgressState): string {
  const serialized: SerializedProgress = {
    completedLevels: [...state.completedLevels],
    hintsSeen: [...state.hintsSeen],
    hintsEnabled: state.hintsEnabled,
  };
  return JSON.stringify(serialized);
}

export function deserializeProgress(data: string): ProgressState {
  const parsed = JSON.parse(data) as SerializedProgress;
  return {
    completedLevels: new Set(parsed.completedLevels),
    hintsSeen: new Set(parsed.hintsSeen),
    hintsEnabled: parsed.hintsEnabled,
  };
}
