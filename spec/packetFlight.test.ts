import { describe, expect, it } from "vitest";
import {
  advance,
  applyToggle,
  phaseProgress,
  reactToToggle,
  spawnOutbound,
  toggleDestination,
  type PacketFlight,
} from "../src/scripts/packetFlight";

// The bug this file guards against: toggling a link mid-flight used to reset
// the whole request/response cycle back to the client, regardless of where
// the packet actually was. The fix is a persisted PacketFlight that reacts to
// a toggle based on exactly where it is: dropped if the toggle cut the exact
// link it's crossing, rerouted (from wherever it's headed, not the client) if
// the break is elsewhere on its path but ahead of it, otherwise unaffected.

const bypass = {
  edges: [
    { id: "A-B", from: "A", to: "B", latency: 5 },
    { id: "B-C", from: "B", to: "C", latency: 5 },
    { id: "C-D", from: "C", to: "D", latency: 5 },
    { id: "B-D", from: "B", to: "D", latency: 100 },
  ],
};

const deadEnd = {
  edges: [
    { id: "A-B", from: "A", to: "B", latency: 5 },
    { id: "B-C", from: "B", to: "C", latency: 5 },
  ],
};

describe("reactToToggle", () => {
  it("is unaffected when the broken link isn't on the packet's path", () => {
    const reaction = reactToToggle(bypass, ["A", "B", "C", "D"], 0, "B-D", ["D"], new Set(["B-D"]));
    expect(reaction).toEqual({ kind: "unaffected" });
  });

  it("drops the packet when the broken link is exactly the one it's crossing", () => {
    const reaction = reactToToggle(bypass, ["A", "B", "C", "D"], 1, "B-C", ["D"], new Set(["B-C"]));
    expect(reaction).toEqual({ kind: "dropped" });
  });

  it("reroutes from the node ahead when a link further along the path breaks", () => {
    const reaction = reactToToggle(bypass, ["A", "B", "C", "D"], 0, "C-D", ["D"], new Set(["C-D"]));
    expect(reaction).toEqual({ kind: "rerouted", path: ["A", "B", "D"] });
  });

  it("drops the packet when the node ahead is left fully stranded", () => {
    const reaction = reactToToggle(deadEnd, ["A", "B", "C"], 0, "B-C", ["C"], new Set(["B-C"]));
    expect(reaction).toEqual({ kind: "dropped" });
  });
});

describe("phaseProgress", () => {
  it("reports the current hop and progress through it", () => {
    expect(phaseProgress(["A", "B", "C"], 1000, 1350, 700)).toEqual({
      done: false,
      hop: 0,
      withinHop: 0.5,
    });
  });

  it("is done exactly when every hop's duration has elapsed", () => {
    expect(phaseProgress(["A", "B", "C"], 1000, 1000 + 2 * 700, 700)).toEqual({ done: true });
  });
});

describe("applyToggle", () => {
  const flight: PacketFlight = {
    phase: "outbound",
    path: ["A", "B", "C", "D"],
    phaseStart: 1000,
    dropped: null,
  };

  it("is a no-op when the toggle is a repair, not a break", () => {
    const result = applyToggle(bypass, flight, "C-D", new Set(), ["D"], 1350, 700);
    expect(result).toBe(flight);
  });

  it("preserves phaseStart on a successful reroute, so the travelled hop doesn't jump", () => {
    const result = applyToggle(bypass, flight, "C-D", new Set(["C-D"]), ["D"], 1350, 700);
    expect(result.path).toEqual(["A", "B", "D"]);
    expect(result.phaseStart).toBe(1000);
    expect(result.dropped).toBeNull();
  });

  it("drops the packet when the toggle cuts the link it's currently crossing", () => {
    const midCross: PacketFlight = { ...flight, phaseStart: 1000 };
    const result = applyToggle(bypass, midCross, "A-B", new Set(["A-B"]), ["D"], 1350, 700);
    expect(result.dropped).toEqual({ hop: 0, withinHop: 0.5, since: 1350 });
  });

  // The bug this guards against: the caller in diagram.ts used to pass the
  // level's server destinations to every toggle, outbound or not. A response
  // packet cut off from the client would "reroute" toward a server instead —
  // trivially reachable from almost anywhere, so it never dropped, it just
  // silently reversed direction. toggleDestination is what the caller must use
  // to pick the right target per phase; this exercises the response side
  // end-to-end the same way the level 5 network can hit it.
  it("reroutes a response toward the source, the long way round, rather than toward a destination", () => {
    const response: PacketFlight = {
      phase: "response",
      path: ["D", "C", "B", "A"],
      phaseStart: 1000,
      dropped: null,
    };
    const result = applyToggle(
      bypass,
      response,
      "B-C",
      new Set(["B-C"]),
      toggleDestination(response, "A", ["D"]),
      1350,
      700,
    );
    expect(result.path).toEqual(["D", "C", "D", "B", "A"]);
    expect(result.dropped).toBeNull();
  });
});

describe("toggleDestination", () => {
  it("aims at the destinations while the packet is still outbound", () => {
    const flight: PacketFlight = { phase: "outbound", path: ["A", "B"], phaseStart: 0, dropped: null };
    expect(toggleDestination(flight, "A", ["D"])).toEqual(["D"]);
  });

  it("aims back at the source once the packet has become a response", () => {
    const flight: PacketFlight = { phase: "response", path: ["D", "C"], phaseStart: 0, dropped: null };
    expect(toggleDestination(flight, "A", ["D"])).toEqual(["A"]);
  });
});

describe("advance", () => {
  it("keeps a dropped packet frozen until the respawn delay elapses", () => {
    const flight: PacketFlight = {
      phase: "outbound",
      path: ["A", "B"],
      phaseStart: 0,
      dropped: { hop: 0, withinHop: 0.5, since: 1000 },
    };
    const result = advance(
      flight,
      1500,
      700,
      600,
      () => null,
      () => ["A", "B"],
    );
    expect(result).toBe(flight);
  });

  it("respawns a fresh outbound flight once the respawn delay elapses", () => {
    const flight: PacketFlight = {
      phase: "outbound",
      path: ["A", "B"],
      phaseStart: 0,
      dropped: { hop: 0, withinHop: 0.5, since: 1000 },
    };
    const result = advance(
      flight,
      1700,
      700,
      600,
      () => null,
      () => ["A", "C", "B"],
    );
    expect(result).toEqual(spawnOutbound(["A", "C", "B"], 1700));
  });

  it("stays null (nothing to show) if a dropped packet's respawn finds no route", () => {
    const flight: PacketFlight = {
      phase: "outbound",
      path: ["A", "B"],
      phaseStart: 0,
      dropped: { hop: 0, withinHop: 0.5, since: 1000 },
    };
    const result = advance(flight, 1700, 700, 600, () => null, () => null);
    expect(result).toBeNull();
  });

  it("transitions outbound to response using the computed return leg, not the outbound path reversed", () => {
    const flight: PacketFlight = {
      phase: "outbound",
      path: ["A", "B", "D"],
      phaseStart: 0,
      dropped: null,
    };
    const now = 2 * 700;
    const result = advance(
      flight,
      now,
      700,
      600,
      () => ["D", "C", "A"],
      () => null,
    );
    expect(result).toEqual({ phase: "response", path: ["D", "C", "A"], phaseStart: now, dropped: null });
  });

  it("drops a packet stranded at its destination when no return leg exists", () => {
    const flight: PacketFlight = {
      phase: "outbound",
      path: ["A", "B", "D"],
      phaseStart: 0,
      dropped: null,
    };
    const now = 2 * 700;
    const result = advance(flight, now, 700, 600, () => null, () => null);
    expect(result?.dropped).toEqual({ hop: 1, withinHop: 1, since: now });
  });

  it("respawns a fresh outbound flight once a response phase completes", () => {
    const flight: PacketFlight = {
      phase: "response",
      path: ["D", "B", "A"],
      phaseStart: 0,
      dropped: null,
    };
    const now = 2 * 700;
    const result = advance(flight, now, 700, 600, () => null, () => ["A", "B", "D"]);
    expect(result).toEqual(spawnOutbound(["A", "B", "D"], now));
  });
});
