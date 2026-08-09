import { describe, expect, it } from "vitest";
import { focusOrder, moveFocus } from "../src/lib/focus";

// Keyboard access to the diagram: the diagram is one Tab stop (Tab moves on
// to the next control — Reset, Settings, Help — using ordinary DOM order,
// no bespoke keybind); arrow keys then roam between nodes AND links inside
// it. Toggling a focused link (Space, or a click) is already covered by
// `toggleLink` in network-resilience.test.ts — this file only covers moving
// focus around, kept independent of screen position or rendering.

const graph = {
  nodes: ["A", "B", "C"],
  edges: [
    { id: "AB", from: "A", to: "B" },
    { id: "BC", from: "B", to: "C" },
  ],
};

describe("focusOrder", () => {
  it("lists every node, then every link", () => {
    expect(focusOrder(graph)).toEqual([
      { kind: "node", id: "A" },
      { kind: "node", id: "B" },
      { kind: "node", id: "C" },
      { kind: "link", id: "AB" },
      { kind: "link", id: "BC" },
    ]);
  });
});

describe("moveFocus", () => {
  const order = focusOrder(graph);

  it("moves to the first target when nothing is focused yet", () => {
    expect(moveFocus(order, null, "next")).toEqual({ kind: "node", id: "A" });
  });

  it("moves forward from a node to the next target, node or link alike", () => {
    const current = { kind: "node" as const, id: "C" };
    expect(moveFocus(order, current, "next")).toEqual({ kind: "link", id: "AB" });
  });

  it("wraps from the last target back to the first", () => {
    const last = { kind: "link" as const, id: "BC" };
    expect(moveFocus(order, last, "next")).toEqual({ kind: "node", id: "A" });
  });

  it("wraps backward from the first target to the last", () => {
    const first = { kind: "node" as const, id: "A" };
    expect(moveFocus(order, first, "prev")).toEqual({ kind: "link", id: "BC" });
  });
});
