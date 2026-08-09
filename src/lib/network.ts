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

export function toggleLink(broken: Set<string>, edgeId: string): Set<string> {
  const next = new Set(broken);
  if (next.has(edgeId)) {
    next.delete(edgeId);
  } else {
    next.add(edgeId);
  }
  return next;
}
