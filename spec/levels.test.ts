import { describe, expect, it } from "vitest";
import { routes } from "../src/lib/network";
import { levels } from "../src/data/levels";
import { deviceHints } from "../src/data/deviceHints";

// Content-integrity checks on the actual level dataset (level 1 is the
// tutorial). These aren't about the reachability/progress logic --- that's
// covered elsewhere --- they're about the levels you author breaking one of
// your own stated design rules before a visitor ever sees it: an edge
// pointing at a node that doesn't exist, a level that's unsolvable before a
// single click, a device on screen with no hint copy behind it.

describe("levels data", () => {
  it("has at least the tutorial and one real level", () => {
    expect(levels.length).toBeGreaterThanOrEqual(2);
  });

  it("every edge references nodes that exist in the same level", () => {
    for (const level of levels) {
      const nodeIds = new Set(level.nodes.map((n) => n.id));
      for (const edge of level.edges) {
        expect(
          nodeIds.has(edge.from) && nodeIds.has(edge.to),
          `level ${level.id}: edge "${edge.id}" references a node not in this level`,
        ).toBe(true);
      }
    }
  });

  it("has unique edge ids within each level", () => {
    for (const level of levels) {
      const ids = level.edges.map((e) => e.id);
      expect(new Set(ids).size, `level ${level.id} has duplicate edge ids`).toBe(ids.length);
    }
  });

  it("gives every edge a positive latency", () => {
    for (const level of levels) {
      for (const edge of level.edges) {
        expect(edge.latency, `level ${level.id}: edge "${edge.id}" has non-positive latency`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps source and every destination inside the level's own graph", () => {
    for (const level of levels) {
      const nodeIds = new Set(level.nodes.map((n) => n.id));
      expect(nodeIds.has(level.source), `level ${level.id}: source "${level.source}" isn't a node`).toBe(true);
      for (const destination of level.destinations) {
        expect(nodeIds.has(destination), `level ${level.id}: destination "${destination}" isn't a node`).toBe(true);
      }
    }
  });

  it("starts every level fully connected, before any link is broken", () => {
    for (const level of levels) {
      const found = routes(level, level.source, level.destinations, new Set());
      expect(
        found.length,
        `level ${level.id} has no path from ${level.source} to any of [${level.destinations.join(", ")}] with nothing broken`,
      ).toBeGreaterThan(0);
    }
  });

  it("grows, or holds steady, from one level to the next", () => {
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i].edges.length,
        `level ${levels[i].id} has fewer links than level ${levels[i - 1].id} --- levels are meant to gradually increase in size`,
      ).toBeGreaterThanOrEqual(levels[i - 1].edges.length);
    }
  });

  it("has hint copy authored for every device type actually used", () => {
    const used = new Set(levels.flatMap((level) => level.nodes.map((n) => n.type)));
    for (const type of used) {
      expect(deviceHints[type], `no hint copy for device type "${type}"`).toBeTruthy();
    }
  });
});
