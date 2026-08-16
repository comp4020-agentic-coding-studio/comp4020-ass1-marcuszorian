import { routes, type Graph } from "../lib/network";

export type PacketPhase = "outbound" | "response";

export type DroppedPacket = {
  hop: number;
  withinHop: number;
  since: number;
};

export type PacketFlight = {
  phase: PacketPhase;
  path: string[];
  phaseStart: number;
  dropped: DroppedPacket | null;
};

export function spawnOutbound(path: string[], now: number): PacketFlight {
  return { phase: "outbound", path, phaseStart: now, dropped: null };
}

export type PhaseProgress = { done: false; hop: number; withinHop: number } | { done: true };

export function phaseProgress(
  path: string[],
  phaseStart: number,
  now: number,
  hopDurationMs: number,
): PhaseProgress {
  const hops = path.length - 1;
  // requestAnimationFrame's timestamp can land fractionally before a
  // performance.now() taken moments earlier (documented rAF behaviour, seen
  // on the very first frame after a fresh phaseStart) — clamp so that never
  // reads back as a negative hop.
  const elapsed = Math.max(0, now - phaseStart);
  const hop = Math.floor(elapsed / hopDurationMs);
  if (hop >= hops) {
    return { done: true };
  }
  return { done: false, hop, withinHop: (elapsed - hop * hopDurationMs) / hopDurationMs };
}

export type ToggleReaction =
  | { kind: "unaffected" }
  | { kind: "rerouted"; path: string[] }
  | { kind: "dropped" };

function edgeIndexFor(graph: Graph, path: string[], linkId: string): number {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const edge = graph.edges.find(
      (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a),
    );
    if (edge?.id === linkId) {
      return i;
    }
  }
  return -1;
}

/**
 * Only meaningful for a link that just broke — a repaired link can never be
 * on `path`, since `routes()` skips broken edges when a path is computed.
 */
export function reactToToggle(
  graph: Graph,
  path: string[],
  hop: number,
  changedLinkId: string,
  destination: string[],
  broken: Set<string>,
): ToggleReaction {
  const index = edgeIndexFor(graph, path, changedLinkId);
  if (index === -1 || index < hop) {
    return { kind: "unaffected" };
  }
  if (index === hop) {
    return { kind: "dropped" };
  }
  const found = routes(graph, path[hop + 1], destination, broken);
  if (found.length === 0) {
    return { kind: "dropped" };
  }
  return { kind: "rerouted", path: [...path.slice(0, hop + 2), ...found[0].path.slice(1)] };
}

export function applyToggle(
  graph: Graph,
  flight: PacketFlight,
  changedLinkId: string,
  broken: Set<string>,
  destination: string[],
  now: number,
  hopDurationMs: number,
): PacketFlight {
  if (flight.dropped || !broken.has(changedLinkId)) {
    return flight;
  }
  const progress = phaseProgress(flight.path, flight.phaseStart, now, hopDurationMs);
  const hop = progress.done ? flight.path.length - 2 : progress.hop;
  const reaction = reactToToggle(graph, flight.path, hop, changedLinkId, destination, broken);
  if (reaction.kind === "unaffected") {
    return flight;
  }
  if (reaction.kind === "dropped") {
    const withinHop = progress.done ? 1 : progress.withinHop;
    return { ...flight, dropped: { hop, withinHop, since: now } };
  }
  return { ...flight, path: reaction.path };
}

/**
 * Per-frame advance: handles the drop-then-respawn pause and phase
 * transitions. `computeReturnLeg`/`freshOutboundPath` return null when no
 * route exists (stranded or fully disconnected); `advance` then drops the
 * packet where it stands, or clears it entirely, rather than looping forever
 * waiting for a route that isn't there.
 */
export function advance(
  flight: PacketFlight,
  now: number,
  hopDurationMs: number,
  respawnDelayMs: number,
  computeReturnLeg: (reachedNode: string) => string[] | null,
  freshOutboundPath: () => string[] | null,
): PacketFlight | null {
  if (flight.dropped) {
    if (now - flight.dropped.since < respawnDelayMs) {
      return flight;
    }
    const path = freshOutboundPath();
    return path ? spawnOutbound(path, now) : null;
  }

  const progress = phaseProgress(flight.path, flight.phaseStart, now, hopDurationMs);
  if (!progress.done) {
    return flight;
  }

  if (flight.phase === "outbound") {
    const reached = flight.path[flight.path.length - 1];
    const inbound = computeReturnLeg(reached);
    if (!inbound) {
      return { ...flight, dropped: { hop: flight.path.length - 2, withinHop: 1, since: now } };
    }
    return { phase: "response", path: inbound, phaseStart: now, dropped: null };
  }

  const path = freshOutboundPath();
  return path ? spawnOutbound(path, now) : null;
}
