// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { initialProgress, markHintSeen, recordBreak } from "../src/lib/progress";
import { loadProgress, saveProgress } from "../src/lib/persistence";

// "Persistence is maintained across reload" — the app has no backend, so
// the only durable store is localStorage. This file gets its own jsdom
// environment (the rest of the suite runs in plain node, since nothing else
// touches the DOM or browser storage) so `localStorage` is real rather than
// mocked, and a save→load round trip is an honest stand-in for a reload:
// loadProgress() here has no memory of the state that called saveProgress(),
// only what's actually sitting in storage.

beforeEach(() => {
  localStorage.clear();
});

describe("loadProgress", () => {
  it("returns a fresh state when nothing has been saved yet", () => {
    expect(loadProgress()).toEqual(initialProgress());
  });

  it("falls back to a fresh state if storage holds something unreadable", () => {
    localStorage.setItem("break-the-internet:progress", "not json");
    expect(loadProgress()).toEqual(initialProgress());
  });
});

describe("saveProgress / loadProgress round trip", () => {
  it("survives a simulated reload", () => {
    let state = recordBreak(initialProgress(), 1, false);
    state = markHintSeen(state, "device:router");
    saveProgress(state);

    const reloaded = loadProgress();

    expect(reloaded.completedLevels).toEqual(new Set([1]));
    expect(reloaded.hintsSeen).toEqual(new Set(["device:router"]));
  });
});
