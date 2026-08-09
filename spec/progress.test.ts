import { describe, expect, it } from "vitest";
import {
  deserializeProgress,
  initialProgress,
  markHintSeen,
  recordBreak,
  resetProgress,
  serializeProgress,
  setHintsEnabled,
  shouldShowHint,
} from "../src/lib/progress";

// Completion counter: "completion should be once the network has been
// broken" — a level flips to complete the first time it's fully
// disconnected, and stays complete even if you Reset Level and reconnect
// it afterward. Hints (device-intro cards and tutorial callouts, treated as
// one category) show once per id, unless turned off entirely. Settings'
// "Reset Progress" clears the counter and re-shows every hint — but leaves
// the hints-enabled preference itself alone, since that's a standing
// choice, not progress.

describe("recordBreak", () => {
  it("does not complete a level that's still connected", () => {
    const state = recordBreak(initialProgress(), 2, /* connected */ true);
    expect(state.completedLevels.has(2)).toBe(false);
  });

  it("completes a level once it's been fully disconnected", () => {
    const state = recordBreak(initialProgress(), 2, /* connected */ false);
    expect(state.completedLevels.has(2)).toBe(true);
  });

  it("stays completed even if the level is reconnected afterward", () => {
    const broken = recordBreak(initialProgress(), 2, false);
    const reconnected = recordBreak(broken, 2, true);
    expect(reconnected.completedLevels.has(2)).toBe(true);
  });
});

describe("hints", () => {
  it("shows an unseen hint when hints are enabled", () => {
    expect(shouldShowHint(initialProgress(), "device:router")).toBe(true);
  });

  it("does not show a hint that's already been seen", () => {
    const state = markHintSeen(initialProgress(), "device:router");
    expect(shouldShowHint(state, "device:router")).toBe(false);
  });

  it("hides every hint once hints are disabled, seen or not", () => {
    const state = setHintsEnabled(initialProgress(), false);
    expect(shouldShowHint(state, "device:router")).toBe(false);
  });
});

describe("resetProgress", () => {
  it("clears completed levels and seen hints, but leaves hintsEnabled alone", () => {
    let state = recordBreak(initialProgress(), 1, false);
    state = markHintSeen(state, "device:router");
    state = setHintsEnabled(state, false);

    const reset = resetProgress(state);

    expect(reset.completedLevels.size).toBe(0);
    expect(reset.hintsSeen.size).toBe(0);
    expect(reset.hintsEnabled).toBe(false);
  });
});

describe("serialization", () => {
  it("round-trips completed levels and seen hints through JSON", () => {
    let state = recordBreak(initialProgress(), 1, false);
    state = recordBreak(state, 3, false);
    state = markHintSeen(state, "device:router");
    state = setHintsEnabled(state, false);

    const restored = deserializeProgress(serializeProgress(state));

    expect(restored.completedLevels).toEqual(new Set([1, 3]));
    expect(restored.hintsSeen).toEqual(new Set(["device:router"]));
    expect(restored.hintsEnabled).toBe(false);
  });
});
