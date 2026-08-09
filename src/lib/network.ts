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
      if (edge.from !== current || broken.has(edge.id) || path.includes(edge.to)) {
        continue;
      }
      walk(edge.to, [...path, edge.to], latency + edge.latency);
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
