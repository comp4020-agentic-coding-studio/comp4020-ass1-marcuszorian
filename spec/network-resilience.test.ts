import { describe, expect, it } from "vitest";
import { roundTrip, routes, toggleLink } from "../src/lib/network";

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

  // A link is a cable, so traffic crosses it whichever way it was authored.
  // The cross-link here is written B->C, and the only way through once B's own
  // exit is cut is to cross it the other way, C->B.
  it("crosses a link in either direction, not just the way it was authored", () => {
    const mesh = {
      edges: [
        { id: "A-B", from: "A", to: "B", latency: 10 },
        { id: "A-C", from: "A", to: "C", latency: 10 },
        { id: "B-C", from: "B", to: "C", latency: 4 },
        { id: "B-D", from: "B", to: "D", latency: 12 },
      ],
    };
    const found = routes(mesh, "A", ["D"], new Set(["A-B"]));
    expect(found.map((r) => r.path)).toEqual([["A", "C", "B", "D"]]);
    expect(found[0].latency).toBe(26);
  });
});

// A2 spec point: the return leg is computed from scratch, from the
// destination back to source, rather than assumed to be the outbound path
// reversed — but it uses the same lowest-cost rule the outbound leg does, so
// with equal cost either way across every link, it converges on that path
// in reverse.
describe("roundTrip", () => {
  it("retraces the outbound path when it's the only surviving route home", () => {
    const trip = roundTrip(diamond, "A", ["D"], new Set(["A-B", "A-C"]));
    expect(trip?.outbound.path).toEqual(["A", "D"]);
    expect(trip?.inbound.path).toEqual(["D", "A"]);
  });

  it("takes the lowest-cost route home, which mirrors the outbound path when costs are symmetric", () => {
    const trip = roundTrip(diamond, "A", ["D"], new Set());
    expect(trip?.outbound.path).toEqual(["A", "D"]);
    expect(trip?.inbound.path).toEqual(["D", "A"]);
  });

  it("is null once every path is broken", () => {
    expect(roundTrip(diamond, "A", ["D"], new Set(["direct", "A-B", "A-C"]))).toBeNull();
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
