export type ProgressState = {
  completedLevels: Set<number>;
};

export function initialProgress(): ProgressState {
  return {
    completedLevels: new Set(),
  };
}

export function recordBreak(state: ProgressState, levelId: number, connected: boolean): ProgressState {
  const completedLevels = new Set(state.completedLevels);
  if (!connected) {
    completedLevels.add(levelId);
  }
  return { ...state, completedLevels };
}

export function resetProgress(): ProgressState {
  return initialProgress();
}

type SerializedProgress = {
  completedLevels: number[];
};

export function serializeProgress(state: ProgressState): string {
  const serialized: SerializedProgress = {
    completedLevels: [...state.completedLevels],
  };
  return JSON.stringify(serialized);
}

export function deserializeProgress(data: string): ProgressState {
  const parsed = JSON.parse(data) as Partial<SerializedProgress>;
  return {
    completedLevels: new Set(parsed.completedLevels ?? []),
  };
}
