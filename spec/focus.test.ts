import { describe, expect, it } from "vitest";
import { focusOrder, moveFocus } from "../src/lib/focus";

// Keyboard access to the diagram: the diagram is one Tab stop (Tab moves on
// to the next control — Reset, Settings, Help — using ordinary DOM order,
// no bespoke keybind); arrow keys then roam between nodes AND links inside
// it, in reading order (left to right, top to bottom to break ties within a
// column) rather than devices-then-links. Toggling a focused link (Space, or
// a click) is already covered by `toggleLink` in network-resilience.test.ts
// — this file only covers moving focus around.

const graph = {
  nodes: [
    { id: "A", x: 0, y: 30 },
    { id: "B", x: 45, y: 30 },
    { id: "C", x: 90, y: 30 },
  ],
  edges: [
    { id: "AB", from: "A", to: "B" },
    { id: "BC", from: "B", to: "C" },
  ],
};

describe("focusOrder", () => {
  it("interleaves nodes and links by position, left to right", () => {
    expect(focusOrder(graph)).toEqual([
      { kind: "node", id: "A" },
      { kind: "link", id: "AB" },
      { kind: "node", id: "B" },
      { kind: "link", id: "BC" },
      { kind: "node", id: "C" },
    ]);
  });

  it("breaks ties in the same column top to bottom", () => {
    const stacked = {
      nodes: [
        { id: "top", x: 45, y: 10 },
        { id: "bottom", x: 45, y: 50 },
      ],
      edges: [],
    };
    expect(focusOrder(stacked)).toEqual([
      { kind: "node", id: "top" },
      { kind: "node", id: "bottom" },
    ]);
  });
});

describe("moveFocus", () => {
  const order = focusOrder(graph);

  it("moves to the first target when nothing is focused yet", () => {
    expect(moveFocus(order, null, "next")).toEqual({ kind: "node", id: "A" });
  });

  it("moves forward from a node to the next target, node or link alike", () => {
    const current = { kind: "node" as const, id: "A" };
    expect(moveFocus(order, current, "next")).toEqual({ kind: "link", id: "AB" });
  });

  it("wraps from the last target back to the first", () => {
    const last = { kind: "node" as const, id: "C" };
    expect(moveFocus(order, last, "next")).toEqual({ kind: "node", id: "A" });
  });

  it("wraps backward from the first target to the last", () => {
    const first = { kind: "node" as const, id: "A" };
    expect(moveFocus(order, first, "prev")).toEqual({ kind: "node", id: "C" });
  });
});
