export type FocusTarget = {
  kind: "node" | "link";
  id: string;
};

export type FocusGraph = {
  nodes: { id: string; x: number; y: number }[];
  edges: { id: string; from: string; to: string }[];
};

/**
 * Reading order: left to right (primary), top to bottom to break ties within
 * a column — these diagrams are laid out left-to-right along the direction
 * traffic flows, so that's the primary axis; a link's position is the
 * midpoint of the two nodes it connects.
 */
export function focusOrder(graph: FocusGraph): FocusTarget[] {
  const positionOf = new Map(graph.nodes.map((n) => [n.id, n]));
  const placed = [
    ...graph.nodes.map((n) => ({ kind: "node" as const, id: n.id, x: n.x, y: n.y })),
    ...graph.edges.map((edge) => {
      const from = positionOf.get(edge.from)!;
      const to = positionOf.get(edge.to)!;
      return { kind: "link" as const, id: edge.id, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    }),
  ];
  placed.sort((a, b) => a.x - b.x || a.y - b.y);
  return placed.map(({ kind, id }) => ({ kind, id }));
}

export function moveFocus(
  order: FocusTarget[],
  current: FocusTarget | null,
  direction: "next" | "prev",
): FocusTarget {
  if (current === null) {
    return direction === "next" ? order[0] : order[order.length - 1];
  }
  const index = order.findIndex((target) => target.kind === current.kind && target.id === current.id);
  const step = direction === "next" ? 1 : -1;
  return order[(index + step + order.length) % order.length];
}
