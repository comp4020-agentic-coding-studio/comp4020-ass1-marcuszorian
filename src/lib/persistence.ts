import { deserializeProgress, initialProgress, serializeProgress, type ProgressState } from "./progress";

const STORAGE_KEY = "break-the-internet:progress";

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, serializeProgress(state));
}

export function loadProgress(): ProgressState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return initialProgress();
  }
  try {
    return deserializeProgress(stored);
  } catch {
    return initialProgress();
  }
}
