import { describe, expect, it } from "vitest";
import { routes, toggleLink } from "../src/lib/network";

// A1 spec: "the visitor does something that changes what they see — state
// the core interaction plainly enough to write a test for it." Core
// interaction for "Can You Break the Internet?": clicking an active link
// breaks it (clicking a broken one repairs it), and the displayed
// connectivity/route between source and destination updates to match.
//
// Point of view: redundancy reduces the risk of a single point of failure,
// but it isn't uptime insurance. Breaking the cheapest path should reroute
// traffic onto a *more expensive* surviving path (visible degradation), not
// silently keep everything the same — and only once every path is broken
// does the network actually disconnect.
//
// This asserts the reachability/latency contract directly rather than
// simulating a DOM click, so it survives whatever markup/rendering approach
// ends up wiring the click handler to it (see CLAUDE.md's C2 note on
// client-rendered pages having no server-rendered content to assert on).
//
// Device types (router/server/client/switch) and level progression (bigger
// topologies, more device variety) are level-content and rendering
// concerns, not part of this reachability contract — they don't change
// what "connected" or "cheapest surviving path" mean.

const diamond = {
  edges: [
    { id: "direct", from: "A", to: "D", latency: 5 },
    { id: "A-B", from: "A", to: "B", latency: 10 },
    { id: "B-D", from: "B", to: "D", latency: 10 },
    { id: "A-C", from: "A", to: "C", latency: 40 },
    { id: "C-D", from: "C", to: "D", latency: 40 },
  ],
};

describe("routes", () => {
  it("returns every surviving path, cheapest first, when nothing is broken", () => {
    const found = routes(diamond, "A", ["D"], new Set());
    expect(found.map((r) => r.path)).toEqual([
      ["A", "D"],
      ["A", "B", "D"],
      ["A", "C", "D"],
    ]);
    expect(found[0].latency).toBe(5);
  });

  it("reroutes onto a more expensive surviving path when the cheapest breaks", () => {
    const found = routes(diamond, "A", ["D"], new Set(["direct"]));
    expect(found[0].path).toEqual(["A", "B", "D"]);
    expect(found[0].latency).toBe(20);
  });

  it("disconnects source from destination once every path is broken", () => {
    const found = routes(diamond, "A", ["D"], new Set(["direct", "A-B", "A-C"]));
    expect(found).toEqual([]);
  });
});

describe("toggleLink", () => {
  it("breaks an active link", () => {
    const broken = toggleLink(new Set(), "direct");
    expect(broken.has("direct")).toBe(true);
  });

  it("repairs a broken link (bidirectional toggle)", () => {
    const broken = toggleLink(new Set(["direct"]), "direct");
    expect(broken.has("direct")).toBe(false);
  });

  it("repair restores the routes that were available before the break", () => {
    const broken = toggleLink(toggleLink(new Set(), "direct"), "direct");
    expect(routes(diamond, "A", ["D"], broken)[0].path).toEqual(["A", "D"]);
  });
});
