export type Edge = {
  id: string;
  from: string;
  to: string;
  latency: number;
};

export type Graph = {
  edges: Edge[];
};

export type Route = {
  path: string[];
  latency: number;
};

export function routes(
  graph: Graph,
  source: string,
  destinations: string[],
  broken: Set<string>,
): Route[] {
  const found: Route[] = [];

  function walk(current: string, path: string[], latency: number) {
    if (destinations.includes(current)) {
      found.push({ path, latency });
      return;
    }
    for (const edge of graph.edges) {
      if (broken.has(edge.id)) {
        continue;
      }
      // A link is a physical cable, not a one-way street: `from` and `to` only
      // say how it was authored. Walking it in one direction only invented
      // dead ends on the meshed levels, where the way onward is across a link
      // that happens to point back the way you came.
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next === null || path.includes(next)) {
        continue;
      }
      walk(next, [...path, next], latency + edge.latency);
    }
  }

  walk(source, [source], 0);
  return found.sort((a, b) => a.latency - b.latency);
}

export type RoundTrip = {
  outbound: Route;
  inbound: Route;
  survivingRoutes: number;
};

/**
 * The return leg is computed from scratch — from whichever destination the
 * outbound path actually reached, back to source — rather than assumed to be
 * the outbound path reversed. It still takes the lowest-cost surviving route
 * home, the same rule the outbound leg used, so in this model (equal cost
 * either way across every link) that lowest-cost route is the outbound path
 * in reverse. Real traffic isn't guaranteed that: each direction can be
 * routed under different policies and end up asymmetric.
 */
export function roundTrip(
  graph: Graph,
  source: string,
  destinations: string[],
  broken: Set<string>,
): RoundTrip | null {
  const outboundRoutes = routes(graph, source, destinations, broken);
  if (outboundRoutes.length === 0) {
    return null;
  }
  const outbound = outboundRoutes[0];
  const reached = outbound.path[outbound.path.length - 1];
  const returnRoutes = routes(graph, reached, [source], broken);
  return { outbound, inbound: returnRoutes[0], survivingRoutes: outboundRoutes.length };
}

export function toggleLink(broken: Set<string>, edgeId: string): Set<string> {
  const next = new Set(broken);
  if (next.has(edgeId)) {
    next.delete(edgeId);
  } else {
    next.add(edgeId);
  }
  return next;
}
