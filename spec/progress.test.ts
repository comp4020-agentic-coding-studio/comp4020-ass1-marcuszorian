import { describe, expect, it } from "vitest";
import {
  deserializeProgress,
  initialProgress,
  recordBreak,
  resetProgress,
  serializeProgress,
} from "../src/lib/progress";

// Completion counter: "completion should be once the network has been
// broken" — a level flips to complete the first time it's fully
// disconnected, and stays complete even if you Reset Level and reconnect
// it afterward. Settings' "Reset Progress" clears the counter back to
// nothing, which is all the progress model tracks now that every level
// lives on one scrolling page and explains itself in prose.

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

describe("resetProgress", () => {
  it("clears every completed level", () => {
    let state = recordBreak(initialProgress(), 1, false);
    state = recordBreak(state, 3, false);

    expect(resetProgress().completedLevels.size).toBe(0);
  });
});

describe("serialization", () => {
  it("round-trips completed levels through JSON", () => {
    let state = recordBreak(initialProgress(), 1, false);
    state = recordBreak(state, 3, false);

    const restored = deserializeProgress(serializeProgress(state));

    expect(restored.completedLevels).toEqual(new Set([1, 3]));
  });

  it("tolerates a payload saved before this shape existed", () => {
    expect(deserializeProgress("{}").completedLevels.size).toBe(0);
  });
});
