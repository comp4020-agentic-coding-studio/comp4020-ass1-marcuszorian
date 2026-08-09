export type FocusTarget = {
  kind: "node" | "link";
  id: string;
};

export type FocusGraph = {
  nodes: string[];
  edges: { id: string; from: string; to: string }[];
};

export function focusOrder(graph: FocusGraph): FocusTarget[] {
  return [
    ...graph.nodes.map((id): FocusTarget => ({ kind: "node", id })),
    ...graph.edges.map((edge): FocusTarget => ({ kind: "link", id: edge.id })),
  ];
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
